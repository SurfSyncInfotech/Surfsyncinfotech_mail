import { randomBytes } from "crypto";
import type { RowDataPacket } from "mysql2";
import { prepareAuth } from "@/lib/auth";
import { prepareCompanies } from "@/lib/companies";
import { getPool } from "@/lib/db";
import { getStalwartSmtpConfig, sendStalwartSmtpEmail, type StalwartSmtpConfig } from "@/lib/stalwart-smtp";
import { readAuthToken } from "@/lib/token";

const FOLDERS = ["inbox", "sent", "drafts", "trash", "spam"] as const;
type Folder = (typeof FOLDERS)[number];

type CompanyRow = RowDataPacket & { id: string; status: "active" | "suspended"; storage_gb: number | null; mailbox_limit: number | null };
type UserRow = RowDataPacket & { email: string; company_id: string | null };
type MailboxRow = RowDataPacket & {
  id: string;
  company_id: string;
  email: string;
  status: "active" | "suspended";
  used_gb: string | number;
  used_bytes: string | number | null;
  storage_gb: number | null;
};
type MessageRow = RowDataPacket & {
  id: string;
  mailbox: string;
  folder: Folder;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  created_at: Date;
};

const sends = new Map<string, number[]>();
let ready: Promise<void> | null = null;

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function bytesOf(mailbox: MailboxRow) {
  if (mailbox.used_bytes !== null && mailbox.used_bytes !== undefined) return Number(mailbox.used_bytes);
  return Math.round(Number(mailbox.used_gb || 0) * 1024 ** 3);
}

function present(row: MessageRow, includeBody: boolean) {
  const view: Record<string, unknown> = {
    messageId: row.id,
    folder: row.folder,
    from: row.from_email,
    to: row.to_email,
    subject: row.subject,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
  if (includeBody) view.body = row.body;
  return view;
}

async function ensureMail() {
  await prepareAuth();
  await prepareCompanies();
  const pool = getPool();
  const [usedBytes] = await pool.query<RowDataPacket[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mailboxes' AND COLUMN_NAME = 'used_bytes'",
  );
  if (usedBytes.length === 0) await pool.query("ALTER TABLE mailboxes ADD COLUMN used_bytes BIGINT NULL");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(32) NOT NULL PRIMARY KEY,
      mailbox VARCHAR(160) NOT NULL,
      folder ENUM('inbox','sent','drafts','trash','spam') NOT NULL,
      from_email VARCHAR(160) NOT NULL,
      to_email VARCHAR(160) NOT NULL,
      subject VARCHAR(200) NOT NULL,
      body MEDIUMTEXT NOT NULL,
      created_at DATETIME(3) NOT NULL,
      KEY messages_box (mailbox, folder, created_at)
    )
  `);
}

function prepareMail() {
  if (!ready) {
    ready = ensureMail().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

async function employeeMailbox(request: Request) {
  if ((process.env.AUTH_JWT_SECRET ?? "").length < 24) {
    return { error: Response.json({ success: false, message: "Mail is not configured." }, { status: 503 }) };
  }
  const token = readAuthToken(request.headers.get("authorization"));
  if (!token) return { error: Response.json({ success: false, message: "A valid login token is required" }, { status: 401 }) };
  if (token.role !== "employee") {
    return { error: Response.json({ success: false, message: "Only an employee can use this mailbox" }, { status: 403 }) };
  }
  await prepareMail();
  const pool = getPool();
  const [users] = await pool.query<UserRow[]>("SELECT email, company_id FROM users WHERE email = ? AND role = 'employee' LIMIT 1", [token.email]);
  const user = users[0];
  if (!user || !user.company_id) return { error: Response.json({ success: false, message: "Employee account was not found" }, { status: 403 }) };
  const [companies] = await pool.query<CompanyRow[]>("SELECT id, status, storage_gb, mailbox_limit FROM companies WHERE id = ? LIMIT 1", [user.company_id]);
  const company = companies[0];
  const [mailboxes] = await pool.query<MailboxRow[]>(
    "SELECT id, company_id, email, status, used_gb, used_bytes, storage_gb FROM mailboxes WHERE company_id = ? AND email = ? LIMIT 1",
    [user.company_id, user.email],
  );
  const mailbox = mailboxes[0];
  if (!company || !mailbox) return { error: Response.json({ success: false, message: "Mailbox was not found" }, { status: 404 }) };
  return { company, mailbox };
}

async function readBody(request: Request) {
  const raw = await request.text();
  if (raw.length > 1_000_000) return { error: Response.json({ success: false, message: "Request body is too large" }, { status: 413 }) };
  if (!raw.length) return { body: {} as Record<string, unknown> };
  try {
    return { body: JSON.parse(raw) as Record<string, unknown> };
  } catch {
    return { error: Response.json({ success: false, message: "Request body must be JSON" }, { status: 400 }) };
  }
}

function withinRate(email: string) {
  const now = Date.now();
  const recent = (sends.get(email) || []).filter((time) => now - time < 60_000);
  if (recent.length >= 30) return false;
  recent.push(now);
  sends.set(email, recent);
  return true;
}

function capBytes(gb: number) {
  return Math.round(gb * 1024 ** 3);
}

export async function listMail(request: Request) {
  const owner = await employeeMailbox(request);
  if ("error" in owner && owner.error) return { status: owner.error.status, body: await owner.error.json() };
  const parsed = await readBody(request);
  if ("error" in parsed && parsed.error) return { status: parsed.error.status, body: await parsed.error.json() };
  const folder = clean(parsed.body.folder, 20).toLowerCase() || "inbox";
  if (!FOLDERS.includes(folder as Folder)) {
    return { status: 400, body: { success: false, message: "folder must be inbox, sent, drafts, trash, or spam" } };
  }
  const [rows] = await getPool().query<MessageRow[]>(
    "SELECT id, mailbox, folder, from_email, to_email, subject, created_at FROM messages WHERE mailbox = ? AND folder = ? ORDER BY created_at DESC",
    [owner.mailbox.email, folder],
  );
  const messages = rows.map((row) => present(row, false));
  return { status: 200, body: { success: true, folder, count: messages.length, messages } };
}

export async function readMail(request: Request) {
  const owner = await employeeMailbox(request);
  if ("error" in owner && owner.error) return { status: owner.error.status, body: await owner.error.json() };
  const parsed = await readBody(request);
  if ("error" in parsed && parsed.error) return { status: parsed.error.status, body: await parsed.error.json() };
  const messageId = clean(parsed.body.messageId, 80);
  const [rows] = await getPool().query<MessageRow[]>(
    "SELECT id, mailbox, folder, from_email, to_email, subject, body, created_at FROM messages WHERE id = ? AND mailbox = ? LIMIT 1",
    [messageId, owner.mailbox.email],
  );
  const message = rows[0];
  if (!message) return { status: 404, body: { success: false, message: "Message was not found in this mailbox" } };
  return { status: 200, body: { success: true, message: present(message, true) } };
}

async function companyUsedBytes(companyId: string) {
  const [rows] = await getPool().query<MailboxRow[]>("SELECT used_gb, used_bytes FROM mailboxes WHERE company_id = ?", [companyId]);
  return rows.reduce((sum, mailbox) => sum + bytesOf(mailbox), 0);
}

export async function sendMail(request: Request) {
  const owner = await employeeMailbox(request);
  if ("error" in owner && owner.error) return { status: owner.error.status, body: await owner.error.json() };
  const parsed = await readBody(request);
  if ("error" in parsed && parsed.error) return { status: parsed.error.status, body: await parsed.error.json() };
  const to = clean(parsed.body.to, 160).toLowerCase();
  const subject = clean(parsed.body.subject, 200);
  const text = clean(parsed.body.body, 100000);
  if (!validEmail(to) || !subject || !text) {
    return { status: 400, body: { success: false, message: "to, subject, and body are required" } };
  }
  if (owner.company.status !== "active" || owner.mailbox.status !== "active") {
    return { status: 409, body: { success: false, message: "This mailbox cannot send while it is suspended" } };
  }
  if (!withinRate(owner.mailbox.email)) {
    return { status: 429, body: { success: false, message: "Sending limit reached. Try again in a minute." } };
  }
  const bytes = Buffer.byteLength(`${subject}\n${text}`);
  const mailboxCap = capBytes(Number(owner.mailbox.storage_gb || owner.company.storage_gb || 0));
  const companyCap = capBytes(Number(owner.company.storage_gb || 0) * Number(owner.company.mailbox_limit || 0));
  const mailboxUsed = bytesOf(owner.mailbox);
  const companyUsed = await companyUsedBytes(owner.company.id);
  if (!mailboxCap || !companyCap || mailboxUsed + bytes > mailboxCap || companyUsed + bytes > companyCap) {
    return { status: 409, body: { success: false, message: "Mailbox storage limit reached" } };
  }

  const pool = getPool();
  const [localRows] = await pool.query<MailboxRow[]>(
    "SELECT id, company_id, email, status, used_gb, used_bytes, storage_gb FROM mailboxes WHERE email = ? LIMIT 1",
    [to],
  );
  const local = localRows[0];
  const [localCompanyRows] = local
    ? await pool.query<CompanyRow[]>("SELECT id, status, storage_gb, mailbox_limit FROM companies WHERE id = ? LIMIT 1", [local.company_id])
    : [[] as CompanyRow[]];
  const localCompany = localCompanyRows[0];
  let smtpConfig: StalwartSmtpConfig | null = null;
  if (!local) {
    try {
      smtpConfig = getStalwartSmtpConfig();
    } catch (error) {
      console.error("Invalid Stalwart SMTP configuration:", error);
      return {
        status: 503,
        body: { success: false, message: "Stalwart SMTP is only partially or incorrectly configured." },
      };
    }
  }
  const now = new Date();
  const sentId = `msg_${randomBytes(8).toString("hex")}`;
  let inboxId: string | null = null;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      "INSERT INTO messages (id, mailbox, folder, from_email, to_email, subject, body, created_at) VALUES (?, ?, 'sent', ?, ?, ?, ?, ?)",
      [sentId, owner.mailbox.email, owner.mailbox.email, to, subject, text, now],
    );
    const senderBytes = mailboxUsed + bytes;
    await connection.query("UPDATE mailboxes SET used_bytes = ?, used_gb = ? WHERE id = ?", [
      senderBytes,
      Math.round((senderBytes / 1024 ** 3) * 10) / 10,
      owner.mailbox.id,
    ]);
    const sameMailbox = local && local.email === owner.mailbox.email;
    const otherMailbox = local && localCompany && local.email !== owner.mailbox.email;
    if (sameMailbox) {
      inboxId = `msg_${randomBytes(8).toString("hex")}`;
      await connection.query(
        "INSERT INTO messages (id, mailbox, folder, from_email, to_email, subject, body, created_at) VALUES (?, ?, 'inbox', ?, ?, ?, ?, ?)",
        [inboxId, owner.mailbox.email, owner.mailbox.email, to, subject, text, now],
      );
    } else if (otherMailbox && localCompany.status === "active" && local.status === "active") {
      const localCap = capBytes(Number(local.storage_gb || localCompany.storage_gb || 0));
      const localCompanyCap = capBytes(Number(localCompany.storage_gb || 0) * Number(localCompany.mailbox_limit || 0));
      const localUsed = bytesOf(local);
      const localCompanyUsed = local.company_id === owner.company.id ? companyUsed + bytes : await companyUsedBytes(local.company_id);
      if (localCap && localCompanyCap && localUsed + bytes <= localCap && localCompanyUsed + bytes <= localCompanyCap) {
        inboxId = `msg_${randomBytes(8).toString("hex")}`;
        await connection.query(
          "INSERT INTO messages (id, mailbox, folder, from_email, to_email, subject, body, created_at) VALUES (?, ?, 'inbox', ?, ?, ?, ?, ?)",
          [inboxId, local.email, owner.mailbox.email, to, subject, text, now],
        );
        const next = localUsed + bytes;
        await connection.query("UPDATE mailboxes SET used_bytes = ?, used_gb = ? WHERE id = ?", [
          next,
          Math.round((next / 1024 ** 3) * 10) / 10,
          local.id,
        ]);
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const sent = {
    messageId: sentId,
    folder: "sent",
    from: owner.mailbox.email,
    to,
    subject,
    createdAt: now.toISOString(),
  };
  if (smtpConfig) {
    try {
      await sendStalwartSmtpEmail(smtpConfig, {
        from: owner.mailbox.email,
        to,
        subject,
        text,
      });
    } catch (error) {
      console.error("Stalwart SMTP submission failed:", error);
      return {
        status: 502,
        body: {
          success: false,
          message: "Message was saved in Sent, but Stalwart did not accept it. Check mail-server logs before retrying.",
          sent,
          delivered: false,
          inboxMessageId: null,
        },
      };
    }
  }

  return {
    status: 201,
    body: {
      success: true,
      message: smtpConfig
        ? "Message accepted by Stalwart for delivery."
        : inboxId
          ? "Message sent"
          : local
            ? "Message saved in Sent. The recipient mailbox could not store it."
            : "Message saved in Sent. External delivery waits for the mail server.",
      sent,
      delivered: Boolean(local && inboxId),
      inboxMessageId: inboxId,
      ...(smtpConfig ? { acceptedByMailServer: true } : {}),
    },
  };
}

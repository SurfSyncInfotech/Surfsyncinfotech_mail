import { randomBytes } from "crypto";
import type { RowDataPacket } from "mysql2";
import { hashPassword, prepareAuth } from "@/lib/auth";
import { prepareCompanies } from "@/lib/companies";
import { getPool } from "@/lib/db";
import { readAuthToken } from "@/lib/token";

type CompanyRow = RowDataPacket & {
  id: string;
  status: "active" | "suspended";
  admin_email: string;
  mailbox_limit: number | null;
  storage_gb: number | null;
};
type UserRow = RowDataPacket & { id: string; email: string; role: string; company_id: string | null };
type MailboxRow = RowDataPacket & { email: string; status: string; used_gb: string | number; storage_gb: number | null };

let ready: Promise<void> | null = null;

function parseEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0) return null;
  const localPart = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(localPart) && localPart.length !== 1) return null;
  if (!/^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,24}$/.test(domain)) return null;
  return { email, localPart, domain };
}

function temporaryPassword() {
  return `${randomBytes(6).toString("base64url")}Aa1`;
}

function present(row: { email: string; status: string; used_gb: string | number; storage_gb: number | null }) {
  return {
    email: row.email,
    status: row.status,
    usedGb: Number(row.used_gb),
    storageGb: row.storage_gb,
  };
}

async function addColumn(column: string, definition: string) {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mailboxes' AND COLUMN_NAME = ?",
    [column],
  );
  if (rows.length === 0) await getPool().query(`ALTER TABLE mailboxes ADD COLUMN \`${column}\` ${definition}`);
}

async function ensureMailboxes() {
  await prepareAuth();
  await prepareCompanies();
  await addColumn("storage_gb", "INT NULL");
}

function prepareMailboxes() {
  if (!ready) ready = ensureMailboxes();
  return ready;
}

async function companyAdmin(request: Request) {
  if ((process.env.AUTH_JWT_SECRET ?? "").length < 24) {
    return { error: Response.json({ success: false, message: "Mailboxes are not configured." }, { status: 503 }) };
  }
  const token = readAuthToken(request.headers.get("authorization"));
  if (!token) return { error: Response.json({ success: false, message: "A valid login token is required" }, { status: 401 }) };
  if (token.role !== "company_admin") {
    return { error: Response.json({ success: false, message: "Only a Company Admin can manage mailboxes" }, { status: 403 }) };
  }
  await prepareMailboxes();
  const pool = getPool();
  const [users] = await pool.query<UserRow[]>(
    "SELECT id, email, role, company_id FROM users WHERE email = ? AND role = 'company_admin' LIMIT 1",
    [token.email],
  );
  const user = users[0];
  if (!user) return { error: Response.json({ success: false, message: "Company Admin account was not found" }, { status: 403 }) };
  const [byId] = user.company_id
    ? await pool.query<CompanyRow[]>("SELECT id, status, admin_email, mailbox_limit, storage_gb FROM companies WHERE id = ? LIMIT 1", [user.company_id])
    : [[] as CompanyRow[]];
  const [byEmail] = byId[0]
    ? [[] as CompanyRow[]]
    : await pool.query<CompanyRow[]>("SELECT id, status, admin_email, mailbox_limit, storage_gb FROM companies WHERE admin_email = ? LIMIT 1", [user.email]);
  const company = byId[0] ?? byEmail[0];
  if (!company) return { error: Response.json({ success: false, message: "Company was not found" }, { status: 404 }) };
  if (company.status !== "active") return { error: Response.json({ success: false, message: "This company is suspended" }, { status: 409 }) };
  return { company };
}

async function readBody(request: Request) {
  const raw = await request.text();
  if (!raw.length) return { body: {} as Record<string, unknown> };
  try {
    return { body: JSON.parse(raw) as Record<string, unknown> };
  } catch {
    return { error: Response.json({ success: false, message: "Request body must be JSON" }, { status: 400 }) };
  }
}

async function parsedEmail(request: Request) {
  const parsed = await readBody(request);
  if ("error" in parsed) return parsed;
  const owner = await companyAdmin(request);
  if ("error" in owner) return { error: Response.json(await owner.error.json(), { status: owner.error.status }) };
  const email = parseEmail(parsed.body.email);
  if (!email) return { error: Response.json({ success: false, message: "email must be a valid mailbox address" }, { status: 400 }) };
  return { email, company: owner.company };
}

export async function createMailbox(request: Request) {
  const input = await parsedEmail(request);
  if ("error" in input) return { status: input.error.status, body: await input.error.json() };
  const { email, company } = input;
  const limit = company.mailbox_limit;
  if (!Number.isInteger(limit) || !limit || limit <= 0) {
    return { status: 409, body: { success: false, message: "This company has no mailbox allowance" } };
  }
  const pool = getPool();
  const [domains] = await pool.query<RowDataPacket[]>("SELECT verified FROM domains WHERE company_id = ? AND domain = ? LIMIT 1", [
    company.id,
    email.domain,
  ]);
  if (!domains[0] || !domains[0].verified) {
    return { status: 409, body: { success: false, message: "The domain must be verified before a mailbox can be created" } };
  }
  const [existingMailbox] = await pool.query<RowDataPacket[]>("SELECT id FROM mailboxes WHERE email = ? LIMIT 1", [email.email]);
  const [existingUser] = await pool.query<RowDataPacket[]>("SELECT id FROM users WHERE email = ? LIMIT 1", [email.email]);
  if (existingMailbox.length > 0 || existingUser.length > 0) {
    return { status: 409, body: { success: false, message: "This mailbox already exists" } };
  }
  const [countRows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM mailboxes WHERE company_id = ?", [company.id]);
  const current = Number(countRows[0].n);
  if (current >= limit) {
    return { status: 409, body: { success: false, message: `Mailbox limit reached. This plan allows ${limit}.` } };
  }
  const storageGb = Number.isFinite(Number(company.storage_gb)) && Number(company.storage_gb) > 0 ? Math.floor(Number(company.storage_gb)) : null;
  const password = temporaryPassword();
  const passwordHash = await hashPassword(password);
  const now = new Date();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      "INSERT INTO mailboxes (id, company_id, email, status, used_gb, storage_gb, created_at) VALUES (?, ?, ?, 'active', 0, ?, ?)",
      [`mbx_${randomBytes(8).toString("hex")}`, company.id, email.email, storageGb, now],
    );
    await connection.query(
      "INSERT INTO users (id, name, email, password_hash, role, company_id, created_at, updated_at) VALUES (?, ?, ?, ?, 'employee', ?, ?, ?)",
      [`usr_${randomBytes(8).toString("hex")}`, email.localPart, email.email, passwordHash, company.id, now, now],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return {
    status: 201,
    body: {
      success: true,
      message: "Mailbox created",
      mailbox: present({ email: email.email, status: "active", used_gb: 0, storage_gb: storageGb }),
      remaining: limit - current - 1,
      temporaryPassword: password,
    },
  };
}

export async function deleteMailbox(request: Request) {
  const input = await parsedEmail(request);
  if ("error" in input) return { status: input.error.status, body: await input.error.json() };
  const pool = getPool();
  const [rows] = await pool.query<MailboxRow[]>("SELECT email FROM mailboxes WHERE company_id = ? AND email = ? LIMIT 1", [
    input.company.id,
    input.email.email,
  ]);
  if (!rows[0]) return { status: 404, body: { success: false, message: "Mailbox was not found for this company" } };
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM mailboxes WHERE company_id = ? AND email = ?", [input.company.id, input.email.email]);
    await connection.query("DELETE FROM users WHERE email = ? AND role = 'employee' AND company_id = ?", [input.email.email, input.company.id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return { status: 200, body: { success: true, message: "Mailbox deleted", email: input.email.email } };
}

export async function resetMailboxPassword(request: Request) {
  const input = await parsedEmail(request);
  if ("error" in input) return { status: input.error.status, body: await input.error.json() };
  const pool = getPool();
  const [rows] = await pool.query<MailboxRow[]>("SELECT email FROM mailboxes WHERE company_id = ? AND email = ? LIMIT 1", [
    input.company.id,
    input.email.email,
  ]);
  if (!rows[0]) return { status: 404, body: { success: false, message: "Mailbox was not found for this company" } };
  const password = temporaryPassword();
  const passwordHash = await hashPassword(password);
  const now = new Date();
  const [users] = await pool.query<UserRow[]>("SELECT id FROM users WHERE email = ? AND role = 'employee' AND company_id = ? LIMIT 1", [
    input.email.email,
    input.company.id,
  ]);
  if (users[0]) {
    await pool.query("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", [passwordHash, now, users[0].id]);
  } else {
    await pool.query(
      "INSERT INTO users (id, name, email, password_hash, role, company_id, created_at, updated_at) VALUES (?, ?, ?, ?, 'employee', ?, ?, ?)",
      [`usr_${randomBytes(8).toString("hex")}`, input.email.localPart, input.email.email, passwordHash, input.company.id, now, now],
    );
  }
  return { status: 200, body: { success: true, message: "Password updated", email: input.email.email, temporaryPassword: password } };
}

import type { RowDataPacket } from "mysql2";
import { prepareAuth } from "@/lib/auth";
import { prepareCompanies } from "@/lib/companies";
import { getPool } from "@/lib/db";
import { readAuthToken } from "@/lib/token";

type CompanyRow = RowDataPacket & {
  id: string;
  name: string;
  status: string;
  admin_email: string;
  plan_name: string | null;
  subscription_status: string | null;
  billing_cycle: string | null;
  renewal_date: Date | string | null;
  mailbox_limit: number | null;
  storage_gb: number | null;
};
type UserRow = RowDataPacket & { email: string; company_id: string | null };
type DomainRow = RowDataPacket & { domain: string; verified: number };
type MailboxRow = RowDataPacket & { used_gb: string | number; used_bytes: string | number | null };

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

function day(value: Date | string | null) {
  if (!value) return null;
  if (value instanceof Date) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const date = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${date}`;
  }
  return String(value).slice(0, 10);
}

async function companyAdmin(request: Request) {
  if ((process.env.AUTH_JWT_SECRET ?? "").length < 24) {
    return { error: Response.json({ success: false, message: "Dashboard is not configured." }, { status: 503 }) };
  }
  const token = readAuthToken(request.headers.get("authorization"));
  if (!token) return { error: Response.json({ success: false, message: "A valid login token is required" }, { status: 401 }) };
  if (token.role !== "company_admin") {
    return { error: Response.json({ success: false, message: "Only a Company Admin can view this dashboard" }, { status: 403 }) };
  }
  await prepareAuth();
  await prepareCompanies();
  const pool = getPool();
  const [usedBytes] = await pool.query<RowDataPacket[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mailboxes' AND COLUMN_NAME = 'used_bytes'",
  );
  if (usedBytes.length === 0) await pool.query("ALTER TABLE mailboxes ADD COLUMN used_bytes BIGINT NULL");
  const [users] = await pool.query<UserRow[]>("SELECT email, company_id FROM users WHERE email = ? AND role = 'company_admin' LIMIT 1", [token.email]);
  const user = users[0];
  if (!user) return { error: Response.json({ success: false, message: "Company Admin account was not found" }, { status: 403 }) };
  const [byId] = user.company_id
    ? await pool.query<CompanyRow[]>("SELECT * FROM companies WHERE id = ? LIMIT 1", [user.company_id])
    : [[] as CompanyRow[]];
  const [byEmail] = byId[0]
    ? [[] as CompanyRow[]]
    : await pool.query<CompanyRow[]>("SELECT * FROM companies WHERE admin_email = ? LIMIT 1", [user.email]);
  const company = byId[0] ?? byEmail[0];
  if (!company) return { error: Response.json({ success: false, message: "Company was not found" }, { status: 404 }) };
  return { company };
}

export async function companyDashboard(request: Request) {
  const owner = await companyAdmin(request);
  if ("error" in owner && owner.error) return { status: owner.error.status, body: await owner.error.json() };
  const pool = getPool();
  const [domains] = await pool.query<DomainRow[]>("SELECT domain, verified FROM domains WHERE company_id = ? ORDER BY domain ASC", [owner.company.id]);
  const [mailboxes] = await pool.query<MailboxRow[]>("SELECT used_gb, used_bytes FROM mailboxes WHERE company_id = ?", [owner.company.id]);
  const usedBytes = mailboxes.reduce((sum, mailbox) => {
    if (mailbox.used_bytes !== null && mailbox.used_bytes !== undefined) return sum + Number(mailbox.used_bytes);
    return sum + Math.round(Number(mailbox.used_gb || 0) * 1024 ** 3);
  }, 0);
  const perMailboxGb = Number(owner.company.storage_gb || 0);
  const allowedMailboxes = Number(owner.company.mailbox_limit || 0);
  return {
    status: 200,
    body: {
      success: true,
      dashboard: {
        companyName: owner.company.name,
        status: owner.company.status,
        subscription: {
          planName: owner.company.plan_name,
          status: owner.company.subscription_status,
          billingCycle: owner.company.billing_cycle,
          renewalDate: day(owner.company.renewal_date),
        },
        mailboxes: {
          used: mailboxes.length,
          allowed: allowedMailboxes,
        },
        storage: {
          usedGb: round3(usedBytes / 1024 ** 3),
          usedBytes,
          allowedGb: perMailboxGb * allowedMailboxes,
          perMailboxGb,
        },
        domains: domains.map((domain) => ({ domain: domain.domain, verified: Boolean(domain.verified) })),
      },
    },
  };
}

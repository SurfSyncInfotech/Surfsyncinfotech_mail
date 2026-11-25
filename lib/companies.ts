import type { RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";
import { listOrders } from "@/lib/orders";

type CompanyRow = RowDataPacket & {
  id: string;
  name: string;
  status: "active" | "suspended";
  admin_email: string;
  plan_name: string | null;
  subscription_status: string | null;
  billing_cycle: string | null;
  mailbox_limit: number | null;
  storage_gb: number | null;
  renewal_date: Date | string | null;
};

type DomainRow = RowDataPacket & { company_id: string; domain: string; verified: number };
type MailboxRow = RowDataPacket & { company_id: string; email: string; status: string; used_gb: string | number };

let ready: Promise<void> | null = null;

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function day(value: Date | string | null) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function present(company: CompanyRow, domains: DomainRow[], mailboxes: MailboxRow[]) {
  return {
    companyId: company.id,
    name: company.name,
    status: company.status,
    adminEmail: company.admin_email,
    subscription: company.plan_name
      ? {
          planName: company.plan_name,
          status: company.subscription_status,
          billingCycle: company.billing_cycle,
          mailboxLimit: company.mailbox_limit,
          storageGb: company.storage_gb,
          renewalDate: day(company.renewal_date),
        }
      : null,
    domains: domains.map((item) => ({ domain: item.domain, verified: Boolean(item.verified) })),
    mailboxes: mailboxes.map((item) => ({ email: item.email, status: item.status, usedGb: Number(item.used_gb) })),
  };
}

async function ensureCompanies() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id VARCHAR(32) NOT NULL PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      status ENUM('active','suspended') NOT NULL,
      admin_email VARCHAR(160) NOT NULL,
      plan_name VARCHAR(120) NULL,
      subscription_status VARCHAR(20) NULL,
      billing_cycle VARCHAR(20) NULL,
      mailbox_limit INT NULL,
      storage_gb INT NULL,
      renewal_date DATE NULL,
      payment_id VARCHAR(40) NULL,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      KEY companies_admin (admin_email)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS domains (
      id VARCHAR(32) NOT NULL PRIMARY KEY,
      company_id VARCHAR(32) NOT NULL,
      domain VARCHAR(160) NOT NULL,
      verified TINYINT(1) NOT NULL,
      created_at DATETIME(3) NOT NULL,
      KEY domains_company (company_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mailboxes (
      id VARCHAR(32) NOT NULL PRIMARY KEY,
      company_id VARCHAR(32) NOT NULL,
      email VARCHAR(160) NOT NULL,
      status ENUM('active','suspended') NOT NULL,
      used_gb DECIMAL(10,1) NOT NULL,
      created_at DATETIME(3) NOT NULL,
      KEY mailboxes_company (company_id)
    )
  `);
  const [usedBytes] = await pool.query<RowDataPacket[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mailboxes' AND COLUMN_NAME = 'used_bytes'",
  );
  if (usedBytes.length === 0) await pool.query("ALTER TABLE mailboxes ADD COLUMN used_bytes BIGINT NULL");
}

export function prepareCompanies() {
  if (!ready) ready = ensureCompanies();
  return ready;
}

async function loadCompanies() {
  await prepareCompanies();
  const pool = getPool();
  const [companies] = await pool.query<CompanyRow[]>("SELECT * FROM companies ORDER BY name ASC");
  if (companies.length === 0) return [];
  const ids = companies.map((company) => company.id);
  const [domains] = await pool.query<DomainRow[]>("SELECT company_id, domain, verified FROM domains WHERE company_id IN (?)", [ids]);
  const [mailboxes] = await pool.query<MailboxRow[]>(
    "SELECT company_id, email, status, used_gb FROM mailboxes WHERE company_id IN (?) ORDER BY email ASC",
    [ids],
  );
  return companies.map((company) =>
    present(
      company,
      domains.filter((item) => item.company_id === company.id),
      mailboxes.filter((item) => item.company_id === company.id),
    ),
  );
}

async function paidRevenue() {
  const paid = await listOrders("paid");
  const revenue = paid.reduce((sum, order) => sum + order.amountPaise / 100, 0);
  return { revenue: Math.round(revenue * 100) / 100, currency: "INR" as const };
}

export async function adminDashboard() {
  const companies = await loadCompanies();
  const activeCompanies = companies.filter((company) => company.status === "active");
  const suspendedCompanies = companies.filter((company) => company.status === "suspended");
  const activeSubscriptions = activeCompanies.filter((company) => company.subscription?.status === "active");
  const allocatedGb = companies.reduce((sum, company) => sum + Number(company.subscription?.storageGb || 0), 0);
  const usedGb = companies.reduce((sum, company) => {
    return sum + company.mailboxes.reduce((inner, mailbox) => inner + Number(mailbox.usedGb || 0), 0);
  }, 0);
  const serverGb = Number(process.env.SERVER_STORAGE_GB || 1000);
  const alertAt = Number(process.env.STORAGE_ALERT_PERCENT || 80);
  const usedPercent = serverGb > 0 ? round1((usedGb / serverGb) * 100) : 0;
  const money = await paidRevenue();
  return {
    success: true,
    dashboard: {
      totalCompanies: companies.length,
      activeCompanies: activeCompanies.length,
      suspendedCompanies: suspendedCompanies.length,
      activeSubscriptions: activeSubscriptions.length,
      revenue: money.revenue,
      currency: money.currency,
      storage: {
        allocatedGb,
        usedGb: round1(usedGb),
        serverGb,
        usedPercent,
        alert: usedPercent >= alertAt,
      },
    },
  };
}

export async function adminCompanies() {
  const companies = await loadCompanies();
  return { success: true, count: companies.length, companies };
}

export async function setCompanyStatus(body: Record<string, unknown>) {
  await prepareCompanies();
  const companyId = typeof body.companyId === "string" ? body.companyId.trim().slice(0, 80) : "";
  const status = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";
  if (status !== "active" && status !== "suspended") {
    return { status: 400, body: { success: false, message: "status must be active or suspended" } };
  }
  const pool = getPool();
  const [found] = await pool.query<CompanyRow[]>("SELECT * FROM companies WHERE id = ? LIMIT 1", [companyId]);
  const company = found[0];
  if (!company) return { status: 404, body: { success: false, message: "Company not found" } };
  const now = new Date();
  await pool.query("UPDATE companies SET status = ?, updated_at = ? WHERE id = ?", [status, now, company.id]);
  await pool.query("UPDATE mailboxes SET status = ? WHERE company_id = ?", [status, company.id]);
  company.status = status;
  const [domains] = await pool.query<DomainRow[]>("SELECT company_id, domain, verified FROM domains WHERE company_id = ?", [company.id]);
  const [mailboxes] = await pool.query<MailboxRow[]>(
    "SELECT company_id, email, status, used_gb FROM mailboxes WHERE company_id = ? ORDER BY email ASC",
    [company.id],
  );
  const message = status === "suspended" ? "Company suspended" : "Company reactivated";
  return { status: 200, body: { success: true, message, company: present(company, domains, mailboxes) } };
}

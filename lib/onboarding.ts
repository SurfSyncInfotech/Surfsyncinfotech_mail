import { randomBytes } from "crypto";
import type { RowDataPacket } from "mysql2";
import { hashPassword, prepareAuth } from "@/lib/auth";
import { prepareCompanies } from "@/lib/companies";
import { getPool } from "@/lib/db";
import { getOrder, type CheckoutOrder } from "@/lib/orders";
import { getPlan } from "@/lib/plans";

type RecordRow = RowDataPacket & {
  payment_id: string;
  company_id: string;
  admin_email: string;
  temp_password: string | null;
};

type CompanyRow = RowDataPacket & {
  id: string;
  name: string;
  status: "active" | "suspended";
  admin_email: string;
  plan_id: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  billing_cycle: string | null;
  mailbox_limit: number | null;
  storage_gb: number | null;
  amount: string | number | null;
  currency: string | null;
  renewal_date: Date | string | null;
};

type UserRow = RowDataPacket & { id: string; role: string; company_id: string | null };

let ready: Promise<void> | null = null;

function day(value: Date | string | null) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function renewalDate(paidAt?: string) {
  const date = new Date(paidAt || Date.now());
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}

function presentCompany(company: CompanyRow) {
  return {
    companyId: company.id,
    name: company.name,
    status: company.status,
    adminEmail: company.admin_email,
    subscription: company.plan_name
      ? {
          planId: company.plan_id,
          planName: company.plan_name,
          status: company.subscription_status,
          billingCycle: company.billing_cycle,
          mailboxLimit: company.mailbox_limit,
          storageGb: company.storage_gb,
          amount: company.amount === null ? null : Number(company.amount),
          currency: company.currency,
          renewalDate: day(company.renewal_date),
        }
      : null,
  };
}

async function addColumn(table: string, column: string, definition: string) {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [table, column],
  );
  if (rows.length === 0) await getPool().query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}

async function ensureOnboarding() {
  await prepareAuth();
  await prepareCompanies();
  await addColumn("users", "company_id", "VARCHAR(32) NULL");
  await addColumn("companies", "plan_id", "VARCHAR(40) NULL");
  await addColumn("companies", "amount", "DECIMAL(12,2) NULL");
  await addColumn("companies", "currency", "CHAR(3) NULL");
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS onboarding_records (
      payment_id VARCHAR(40) NOT NULL PRIMARY KEY,
      company_id VARCHAR(32) NOT NULL,
      admin_email VARCHAR(160) NOT NULL,
      temp_password VARCHAR(80) NULL,
      created_at DATETIME(3) NOT NULL
    )
  `);
}

function prepareOnboarding() {
  if (!ready) ready = ensureOnboarding();
  return ready;
}

function temporaryPassword() {
  return `${randomBytes(6).toString("base64url")}Aa1`;
}

function welcome(order: CheckoutOrder, password: string | null) {
  const message = {
    to: order.adminEmail.trim().toLowerCase(),
    subject: "Your SurfSync Mail workspace is ready",
    message: `Your company workspace for ${order.companyName} is ready. Sign in as ${order.adminEmail.trim().toLowerCase()} and open the Company Admin dashboard.`,
    ...(password ? { temporaryPassword: password } : {}),
  };
  return message;
}

async function companyById(id: string) {
  const [rows] = await getPool().query<CompanyRow[]>("SELECT * FROM companies WHERE id = ? LIMIT 1", [id]);
  return rows[0] ?? null;
}

async function handoff(record: RecordRow, order: CheckoutOrder, reveal: boolean) {
  const company = await companyById(record.company_id);
  const password = reveal ? record.temp_password : null;
  if (password) {
    await getPool().query("UPDATE onboarding_records SET temp_password = NULL WHERE payment_id = ?", [record.payment_id]);
  }
  return {
    status: 200,
    body: {
      success: true,
      message: "Company workspace already created",
      company: company ? presentCompany(company) : { companyId: record.company_id },
      admin: { email: record.admin_email, role: "company_admin" },
      welcomeSent: false,
      ...(password ? { welcome: welcome(order, password) } : {}),
    },
  };
}

async function createWorkspace(order: CheckoutOrder, reveal: boolean) {
  const plan = getPlan(order.planId);
  if (!plan) return { status: 409, body: { success: false, message: "Paid payment is missing mailbox or storage limits" } };
  const adminEmail = order.adminEmail.trim().toLowerCase();
  const companyName = order.companyName.trim();
  if (!companyName || !adminEmail || !order.planName) {
    return { status: 409, body: { success: false, message: "Paid payment is missing company details" } };
  }
  await prepareOnboarding();
  const pool = getPool();
  const [existingRecord] = await pool.query<RecordRow[]>("SELECT * FROM onboarding_records WHERE payment_id = ? LIMIT 1", [order.id]);
  if (existingRecord[0]) return handoff(existingRecord[0], order, reveal);

  const [users] = await pool.query<UserRow[]>("SELECT id, role, company_id FROM users WHERE email = ? LIMIT 1", [adminEmail]);
  const existingUser = users[0];
  if (existingUser && existingUser.role !== "company_admin") {
    return { status: 409, body: { success: false, message: "This email already belongs to another account" } };
  }

  const now = new Date();
  const paidRupees = Math.round(order.amountPaise) / 100;
  const renewal = renewalDate(order.paidAt);
  const password = existingUser ? null : temporaryPassword();
  const passwordHash = password ? await hashPassword(password) : null;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [again] = await connection.query<RecordRow[]>("SELECT * FROM onboarding_records WHERE payment_id = ? LIMIT 1", [order.id]);
    if (again[0]) {
      await connection.rollback();
      return handoff(again[0], order, reveal);
    }
    let companyId = existingUser?.company_id ?? "";
    if (!companyId) {
      const [byPayment] = await connection.query<CompanyRow[]>("SELECT id FROM companies WHERE payment_id = ? LIMIT 1", [order.id]);
      companyId = byPayment[0]?.id ?? "";
    }
    if (!companyId) {
      const [byEmail] = await connection.query<CompanyRow[]>("SELECT id FROM companies WHERE admin_email = ? LIMIT 1", [adminEmail]);
      companyId = byEmail[0]?.id ?? "";
    }
    if (!companyId) {
      companyId = `cmp_${randomBytes(8).toString("hex")}`;
      await connection.query(
        "INSERT INTO companies (id, name, status, admin_email, created_at, updated_at) VALUES (?, ?, 'active', ?, ?, ?)",
        [companyId, companyName, adminEmail, now, now],
      );
    }
    await connection.query(
      `UPDATE companies
       SET name = ?, status = 'active', admin_email = ?, plan_id = ?, plan_name = ?, subscription_status = 'active',
           billing_cycle = 'monthly', mailbox_limit = ?, storage_gb = ?, amount = ?, currency = 'INR', renewal_date = ?, payment_id = ?, updated_at = ?
       WHERE id = ?`,
      [companyName, adminEmail, plan.id, order.planName, plan.mailboxes, plan.storagePerMailboxGb, paidRupees, renewal, order.id, now, companyId],
    );
    if (!existingUser && passwordHash) {
      await connection.query(
        "INSERT INTO users (id, name, email, password_hash, role, company_id, created_at, updated_at) VALUES (?, ?, ?, ?, 'company_admin', ?, ?, ?)",
        [`usr_${randomBytes(8).toString("hex")}`, order.adminName.trim() || `${companyName} Admin`, adminEmail, passwordHash, companyId, now, now],
      );
    } else if (existingUser) {
      await connection.query("UPDATE users SET company_id = ?, updated_at = ? WHERE id = ?", [companyId, now, existingUser.id]);
    }
    await connection.query(
      "INSERT INTO onboarding_records (payment_id, company_id, admin_email, temp_password, created_at) VALUES (?, ?, ?, ?, ?)",
      [order.id, companyId, adminEmail, password, now],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const [record] = await pool.query<RecordRow[]>("SELECT * FROM onboarding_records WHERE payment_id = ? LIMIT 1", [order.id]);
  const saved = record[0];
  const company = saved ? await companyById(saved.company_id) : null;
  const shownPassword = reveal ? saved?.temp_password ?? null : null;
  if (shownPassword) {
    await pool.query("UPDATE onboarding_records SET temp_password = NULL WHERE payment_id = ?", [order.id]);
  }
  return {
    status: 201,
    body: {
      success: true,
      message: "Company workspace created",
      company: company ? presentCompany(company) : { companyId: saved?.company_id },
      admin: { email: adminEmail, role: "company_admin" },
      welcomeSent: false,
      ...(shownPassword ? { welcome: welcome(order, shownPassword) } : {}),
    },
  };
}

export async function openWorkspace(order: CheckoutOrder) {
  if (order.status !== "paid") return;
  try {
    await createWorkspace(order, false);
  } catch {
    return;
  }
}

export async function completeOnboarding(paymentId: string) {
  const order = await getOrder(paymentId);
  if (!order) return { status: 404, body: { success: false, message: "Payment not found" } };
  if (order.status !== "paid") {
    return { status: 409, body: { success: false, message: "Payment is not paid. A success redirect cannot start onboarding." } };
  }
  return createWorkspace(order, true);
}

export async function onboardingStatus(paymentId: string) {
  const order = await getOrder(paymentId);
  if (!order) return { status: 404, body: { success: false, message: "Payment not found" } };
  await prepareOnboarding();
  const [rows] = await getPool().query<RecordRow[]>("SELECT company_id, admin_email FROM onboarding_records WHERE payment_id = ? LIMIT 1", [paymentId]);
  const record = rows[0];
  return {
    status: 200,
    body: {
      success: true,
      paymentId,
      paymentStatus: order.status,
      onboarding: record ? "completed" : "not_started",
      companyId: record ? record.company_id : null,
      adminEmail: record ? record.admin_email : order.adminEmail.trim().toLowerCase(),
    },
  };
}

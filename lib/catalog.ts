import { randomBytes } from "crypto";
import type { RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";
import { GST_PERCENT, plans as sitePlans, type Plan } from "@/lib/plans";

type PlanRow = RowDataPacket & {
  id: string;
  name: string;
  monthly_price: string | number;
  annual_price: string | number;
  currency: string;
  mailbox_limit: number;
  storage_gb: number;
  features: string | string[];
  status: "active" | "inactive";
  suits: string;
  was_monthly_inr: number;
  off_percent: number;
  featured: number;
};

let ready: Promise<void> | null = null;

function money(value: string | number) {
  return Number(value);
}

function featuresOf(value: string | string[]) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function present(row: PlanRow, includeStatus: boolean) {
  const monthlyPrice = money(row.monthly_price);
  const plan: Record<string, unknown> = {
    planId: row.id,
    name: row.name,
    monthlyPrice,
    annualPrice: money(row.annual_price),
    currency: row.currency,
    mailboxLimit: row.mailbox_limit,
    storageGb: row.storage_gb,
    features: featuresOf(row.features),
    suits: row.suits,
    wasMonthlyInr: row.was_monthly_inr,
    offPercent: row.off_percent,
    featured: Boolean(row.featured),
    gstPercent: GST_PERCENT,
    monthlyTotalPaise: monthlyPrice * 100 + monthlyPrice * GST_PERCENT,
  };
  if (includeStatus) plan.status = row.status;
  return plan;
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseAmount(value: unknown) {
  const amount = typeof value === "string" ? Number(value.trim()) : Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return null;
  const paise = Math.round(amount * 100);
  if (Math.abs(amount * 100 - paise) > 1e-6) return null;
  return paise / 100;
}

function parseLimit(value: unknown) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0 || number > 100000) return null;
  return number;
}

function parseFeatures(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20) return null;
  const features: string[] = [];
  for (const item of value) {
    const text = clean(item, 80);
    if (!text) return null;
    features.push(text);
  }
  return features;
}

async function ensurePlans() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS plans (
      id VARCHAR(32) NOT NULL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      monthly_price DECIMAL(12,2) NOT NULL,
      annual_price DECIMAL(12,2) NOT NULL,
      currency CHAR(3) NOT NULL,
      mailbox_limit INT NOT NULL,
      storage_gb INT NOT NULL,
      features JSON NOT NULL,
      status ENUM('active','inactive') NOT NULL,
      suits VARCHAR(200) NOT NULL,
      was_monthly_inr INT NOT NULL,
      off_percent INT NOT NULL,
      featured TINYINT(1) NOT NULL,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      UNIQUE KEY plans_name (name)
    )
  `);
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM plans LIMIT 1");
  if (rows.length > 0) return;
  const now = new Date();
  for (const plan of sitePlans) {
    await pool.query(
      `INSERT INTO plans
        (id, name, monthly_price, annual_price, currency, mailbox_limit, storage_gb, features, status, suits, was_monthly_inr, off_percent, featured, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'INR', ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`,
      [
        plan.id,
        plan.name,
        plan.priceMonthlyInr,
        plan.priceMonthlyInr * 12,
        plan.mailboxes,
        plan.storagePerMailboxGb,
        JSON.stringify(plan.notes),
        plan.suits,
        plan.wasMonthlyInr,
        plan.offPercent,
        plan.featured ? 1 : 0,
        now,
        now,
      ],
    );
  }
}

export function prepareCatalog() {
  if (!ready) ready = ensurePlans();
  return ready;
}

export async function listActivePlans() {
  await prepareCatalog();
  const [rows] = await getPool().query<PlanRow[]>(
    "SELECT * FROM plans WHERE status = 'active' ORDER BY monthly_price ASC, name ASC",
  );
  const plans = rows.map((row) => present(row, false));
  return { success: true, count: plans.length, plans };
}

function fieldsFrom(body: Record<string, unknown>, existing?: PlanRow) {
  const name = clean(body.name, 120) || (existing ? existing.name : "");
  const currency = (clean(body.currency, 3) || (existing ? existing.currency : "INR")).toUpperCase();
  const monthlyPrice = body.monthlyPrice === undefined && existing ? money(existing.monthly_price) : parseAmount(body.monthlyPrice);
  const annualPrice = body.annualPrice === undefined && existing ? money(existing.annual_price) : parseAmount(body.annualPrice);
  const mailboxLimit = body.mailboxLimit === undefined && existing ? existing.mailbox_limit : parseLimit(body.mailboxLimit);
  const storageGb = body.storageGb === undefined && existing ? existing.storage_gb : parseLimit(body.storageGb);
  const features = body.features === undefined && existing ? featuresOf(existing.features) : parseFeatures(body.features);
  if (!name) return { error: "name is required" };
  if (!/^[A-Z]{3}$/.test(currency)) return { error: "currency must be a 3-letter code" };
  if (monthlyPrice === null || annualPrice === null) return { error: "monthlyPrice and annualPrice must be positive numbers" };
  if (mailboxLimit === null || storageGb === null) return { error: "mailboxLimit and storageGb must be positive whole numbers" };
  if (features === null) return { error: "features must be a list of short text items" };
  return { name, currency, monthlyPrice, annualPrice, mailboxLimit, storageGb, features };
}

async function nameTaken(name: string, exceptId?: string) {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT id FROM plans WHERE LOWER(name) = LOWER(?) AND id <> ? LIMIT 1",
    [name, exceptId ?? ""],
  );
  return rows.length > 0;
}

function deskPriceLocked(planId: string, monthlyPrice: number) {
  const site = sitePlans.find((plan) => plan.id === planId) as Plan | undefined;
  return Boolean(site && planId === "desk" && monthlyPrice !== site.priceMonthlyInr);
}

export async function changePlan(body: Record<string, unknown>) {
  await prepareCatalog();
  const pool = getPool();
  const action = clean(body.action, 20).toLowerCase();
  if (action === "create") {
    const fields = fieldsFrom(body);
    if ("error" in fields) return { status: 400, body: { success: false, message: fields.error } };
    if (await nameTaken(fields.name)) return { status: 409, body: { success: false, message: "A plan with this name already exists" } };
    const now = new Date();
    const id = `plan_${randomBytes(8).toString("hex")}`;
    await pool.query(
      `INSERT INTO plans
        (id, name, monthly_price, annual_price, currency, mailbox_limit, storage_gb, features, status, suits, was_monthly_inr, off_percent, featured, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', '', 0, 0, 0, ?, ?)`,
      [id, fields.name, fields.monthlyPrice, fields.annualPrice, fields.currency, fields.mailboxLimit, fields.storageGb, JSON.stringify(fields.features), now, now],
    );
    const [rows] = await pool.query<PlanRow[]>("SELECT * FROM plans WHERE id = ? LIMIT 1", [id]);
    return { status: 201, body: { success: true, message: "Plan created", plan: present(rows[0], true) } };
  }

  const planId = clean(body.planId, 80);
  const [found] = await pool.query<PlanRow[]>("SELECT * FROM plans WHERE id = ? LIMIT 1", [planId]);
  const plan = found[0];
  if (!plan) return { status: 404, body: { success: false, message: "Plan not found" } };

  if (action === "deactivate") {
    await pool.query("UPDATE plans SET status = 'inactive', updated_at = ? WHERE id = ?", [new Date(), plan.id]);
    plan.status = "inactive";
    return { status: 200, body: { success: true, message: "Plan deactivated", plan: present(plan, true) } };
  }

  if (action === "update") {
    const fields = fieldsFrom(body, plan);
    if ("error" in fields) return { status: 400, body: { success: false, message: fields.error } };
    if (deskPriceLocked(plan.id, fields.monthlyPrice)) {
      return { status: 400, body: { success: false, message: "Desk stays at the current test price until the final step" } };
    }
    if (await nameTaken(fields.name, plan.id)) return { status: 409, body: { success: false, message: "A plan with this name already exists" } };
    await pool.query(
      `UPDATE plans
       SET name = ?, monthly_price = ?, annual_price = ?, currency = ?, mailbox_limit = ?, storage_gb = ?, features = ?, updated_at = ?
       WHERE id = ?`,
      [fields.name, fields.monthlyPrice, fields.annualPrice, fields.currency, fields.mailboxLimit, fields.storageGb, JSON.stringify(fields.features), new Date(), plan.id],
    );
    const [rows] = await pool.query<PlanRow[]>("SELECT * FROM plans WHERE id = ? LIMIT 1", [plan.id]);
    return { status: 200, body: { success: true, message: "Plan updated", plan: present(rows[0], true) } };
  }

  return { status: 400, body: { success: false, message: "action must be create, update, or deactivate" } };
}

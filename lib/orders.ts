import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import type { RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";
import { getPlan, monthlyGstPaise, monthlyTotalPaise, type Plan } from "@/lib/plans";

export type PaymentMethod = "card" | "upi" | "netbanking";
export type OrderStatus = "pending_payment" | "paid" | "failed";

export type CheckoutOrder = {
  id: string;
  planId: Plan["id"];
  planName: string;
  amountInr: number;
  gstPaise: number;
  amountPaise: number;
  currency: "INR";
  companyName: string;
  companyDomain: string;
  adminName: string;
  adminEmail: string;
  contactNumber: string;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
  paidAt?: string;
};

type OrderRow = RowDataPacket & {
  id: string;
  plan_id: Plan["id"];
  plan_name: string;
  amount_inr: number;
  gst_paise: number;
  amount_paise: number;
  currency: "INR";
  company_name: string;
  company_domain: string;
  admin_name: string;
  admin_email: string;
  contact_number: string;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: Date | string;
  paid_at: Date | string | null;
};

let ready: Promise<void> | null = null;

function stamp(value: Date | string | null | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function toOrder(row: OrderRow): CheckoutOrder {
  return {
    id: row.id,
    planId: row.plan_id,
    planName: row.plan_name,
    amountInr: Number(row.amount_inr),
    gstPaise: Number(row.gst_paise),
    amountPaise: Number(row.amount_paise),
    currency: "INR",
    companyName: row.company_name,
    companyDomain: row.company_domain,
    adminName: row.admin_name,
    adminEmail: row.admin_email,
    contactNumber: row.contact_number,
    status: row.status,
    paymentMethod: row.payment_method ?? undefined,
    razorpayOrderId: row.razorpay_order_id ?? undefined,
    razorpayPaymentId: row.razorpay_payment_id ?? undefined,
    createdAt: stamp(row.created_at) ?? new Date(0).toISOString(),
    paidAt: stamp(row.paid_at),
  };
}

async function importSavedOrders() {
  const file = path.join(process.cwd(), "data", "orders.json");
  let saved: CheckoutOrder[] = [];
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as CheckoutOrder[];
    saved = Array.isArray(parsed) ? parsed : [];
  } catch {
    return;
  }
  const pool = getPool();
  for (const order of saved) {
    if (!order?.id || !order.planId || !order.status) continue;
    await pool.query(
      `INSERT IGNORE INTO orders
        (id, plan_id, plan_name, amount_inr, gst_paise, amount_paise, currency, company_name, company_domain, admin_name, admin_email, contact_number, status, payment_method, razorpay_order_id, razorpay_payment_id, created_at, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.id,
        order.planId,
        order.planName,
        order.amountInr,
        order.gstPaise,
        order.amountPaise,
        order.companyName,
        order.companyDomain,
        order.adminName,
        order.adminEmail,
        order.contactNumber,
        order.status,
        order.paymentMethod ?? null,
        order.razorpayOrderId ?? null,
        order.razorpayPaymentId ?? null,
        new Date(order.createdAt),
        order.paidAt ? new Date(order.paidAt) : null,
      ],
    );
  }
}

async function setupOrders() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(40) NOT NULL PRIMARY KEY,
      plan_id VARCHAR(20) NOT NULL,
      plan_name VARCHAR(40) NOT NULL,
      amount_inr INT NOT NULL,
      gst_paise INT NOT NULL,
      amount_paise INT NOT NULL,
      currency CHAR(3) NOT NULL,
      company_name VARCHAR(160) NOT NULL,
      company_domain VARCHAR(160) NOT NULL,
      admin_name VARCHAR(80) NOT NULL,
      admin_email VARCHAR(160) NOT NULL,
      contact_number VARCHAR(20) NOT NULL,
      status ENUM('pending_payment','paid','failed') NOT NULL,
      payment_method ENUM('card','upi','netbanking') NULL,
      razorpay_order_id VARCHAR(40) NULL,
      razorpay_payment_id VARCHAR(40) NULL,
      created_at DATETIME(3) NOT NULL,
      paid_at DATETIME(3) NULL,
      UNIQUE KEY orders_razorpay (razorpay_order_id)
    )
  `);
  await importSavedOrders();
}

function prepareOrders() {
  if (!ready) {
    ready = setupOrders().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

export async function listOrders(status?: OrderStatus) {
  await prepareOrders();
  const [rows] = status
    ? await getPool().query<OrderRow[]>("SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC", [status])
    : await getPool().query<OrderRow[]>("SELECT * FROM orders ORDER BY created_at DESC");
  return rows.map(toOrder);
}

export async function getOrder(id: string) {
  await prepareOrders();
  const [rows] = await getPool().query<OrderRow[]>("SELECT * FROM orders WHERE id = ? LIMIT 1", [id]);
  return rows[0] ? toOrder(rows[0]) : null;
}

export async function findByRazorpayOrderId(razorpayOrderId: string) {
  await prepareOrders();
  const [rows] = await getPool().query<OrderRow[]>("SELECT * FROM orders WHERE razorpay_order_id = ? LIMIT 1", [razorpayOrderId]);
  return rows[0] ? toOrder(rows[0]) : null;
}

export async function createOrder(input: {
  planId: Plan["id"];
  companyName: string;
  companyDomain: string;
  adminName: string;
  adminEmail: string;
  contactNumber: string;
}) {
  const plan = getPlan(input.planId);
  if (!plan) return null;
  await prepareOrders();
  const order: CheckoutOrder = {
    id: `ss_${randomBytes(8).toString("hex")}`,
    planId: plan.id,
    planName: plan.name,
    amountInr: plan.priceMonthlyInr,
    gstPaise: monthlyGstPaise(plan),
    amountPaise: monthlyTotalPaise(plan),
    currency: "INR",
    companyName: input.companyName,
    companyDomain: input.companyDomain,
    adminName: input.adminName,
    adminEmail: input.adminEmail,
    contactNumber: input.contactNumber,
    status: "pending_payment",
    createdAt: new Date().toISOString(),
  };
  await getPool().query(
    `INSERT INTO orders
      (id, plan_id, plan_name, amount_inr, gst_paise, amount_paise, currency, company_name, company_domain, admin_name, admin_email, contact_number, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?, ?, 'pending_payment', ?)`,
    [
      order.id,
      order.planId,
      order.planName,
      order.amountInr,
      order.gstPaise,
      order.amountPaise,
      order.companyName,
      order.companyDomain,
      order.adminName,
      order.adminEmail,
      order.contactNumber,
      new Date(order.createdAt),
    ],
  );
  return order;
}

export async function updateOrder(id: string, patch: Partial<CheckoutOrder>) {
  const current = await getOrder(id);
  if (!current) return null;
  const next: CheckoutOrder = {
    ...current,
    ...patch,
    id: current.id,
    planId: current.planId,
    planName: current.planName,
    amountInr: current.amountInr,
    gstPaise: current.gstPaise,
    amountPaise: current.amountPaise,
    currency: "INR",
  };
  await getPool().query(
    `UPDATE orders
     SET status = ?, payment_method = ?, razorpay_order_id = ?, razorpay_payment_id = ?, paid_at = ?
     WHERE id = ?`,
    [next.status, next.paymentMethod ?? null, next.razorpayOrderId ?? null, next.razorpayPaymentId ?? null, next.paidAt ? new Date(next.paidAt) : null, next.id],
  );
  return next;
}

export function safeEqual(left: string, right: string) {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}

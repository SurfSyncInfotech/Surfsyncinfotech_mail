import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
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

const filePath = path.join(process.cwd(), "data", "orders.json");
let queue: Promise<unknown> = Promise.resolve();

function withOrders<T>(fn: (orders: CheckoutOrder[]) => Promise<{ orders: CheckoutOrder[]; result: T } | { result: T }>) {
  const run = queue.then(async () => {
    let orders: CheckoutOrder[] = [];
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as CheckoutOrder[];
      orders = Array.isArray(parsed) ? parsed : [];
    } catch {
      orders = [];
    }
    const outcome = await fn(orders);
    if ("orders" in outcome) {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, JSON.stringify(outcome.orders, null, 2), "utf8");
    }
    return outcome.result;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function listOrders(status?: OrderStatus) {
  return withOrders(async (orders) => {
    const filtered = status ? orders.filter((order) => order.status === status) : orders;
    return { result: filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)) };
  });
}

export function getOrder(id: string) {
  return withOrders(async (orders) => ({ result: orders.find((order) => order.id === id) ?? null }));
}

export function findByRazorpayOrderId(razorpayOrderId: string) {
  return withOrders(async (orders) => ({
    result: orders.find((order) => order.razorpayOrderId === razorpayOrderId) ?? null,
  }));
}

export function createOrder(input: {
  planId: Plan["id"];
  companyName: string;
  companyDomain: string;
  adminName: string;
  adminEmail: string;
  contactNumber: string;
}) {
  const plan = getPlan(input.planId);
  if (!plan) return Promise.resolve(null);
  return withOrders(async (orders) => {
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
    return { orders: [...orders, order], result: order };
  });
}

export function updateOrder(id: string, patch: Partial<CheckoutOrder>) {
  return withOrders(async (orders) => {
    const index = orders.findIndex((order) => order.id === id);
    if (index < 0) return { result: null };
    const current = orders[index];
    const next: CheckoutOrder = {
      ...current,
      ...patch,
      id: current.id,
      planId: current.planId,
      amountInr: current.amountInr,
      gstPaise: current.gstPaise,
      amountPaise: current.amountPaise,
      currency: "INR",
    };
    const copy = orders.slice();
    copy[index] = next;
    return { orders: copy, result: next };
  });
}

export function safeEqual(left: string, right: string) {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}

import { createHmac, timingSafeEqual } from "crypto";
import type { CheckoutOrder, PaymentMethod } from "@/lib/orders";

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function authHeader() {
  const key = process.env.RAZORPAY_KEY_ID ?? "";
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
}

export async function createRazorpayOrder(order: CheckoutOrder) {
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: order.amountPaise,
      currency: "INR",
      receipt: order.id,
      notes: {
        planId: order.planId,
        companyDomain: order.companyDomain,
      },
    }),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { id?: string; amount?: number; currency?: string };
  if (!body.id || body.amount !== order.amountPaise || body.currency !== "INR") return null;
  return body.id;
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !orderId || !paymentId || !signature) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function fetchPayment(paymentId: string) {
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: authHeader() },
  });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    id?: string;
    order_id?: string;
    amount?: number;
    currency?: string;
    status?: string;
    method?: string;
  };
  return body;
}

export function validVpa(value: string) {
  return /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/.test(value.trim());
}

export async function createUpiCollect(input: {
  amountPaise: number;
  razorpayOrderId: string;
  email: string;
  contact: string;
  description: string;
  vpa: string;
  ip: string;
  referer: string;
  userAgent: string;
}) {
  const payload = {
    amount: input.amountPaise,
    currency: "INR",
    order_id: input.razorpayOrderId,
    email: input.email,
    contact: input.contact,
    method: "upi",
    description: input.description,
    ip: input.ip,
    referer: input.referer,
    user_agent: input.userAgent,
    upi: { flow: "collect", vpa: input.vpa.trim() },
  };
  const response = await fetch("https://api.razorpay.com/v1/payments/create/upi", {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => null)) as {
    razorpay_payment_id?: string;
    error?: { description?: string };
  } | null;
  if (response.ok && body?.razorpay_payment_id) {
    return { ok: true as const, paymentId: body.razorpay_payment_id };
  }
  const description = body?.error?.description || "";
  if (response.status === 400 && /url was not found/i.test(description)) {
    return {
      ok: false as const,
      error: "Banks no longer accept a typed UPI id on a website. Use Show QR, or pay by card.",
    };
  }
  return { ok: false as const, error: description || "The UPI request could not be sent." };
}

export function methodAllowed(method: string): method is PaymentMethod {
  return method === "card" || method === "upi" || method === "netbanking";
}

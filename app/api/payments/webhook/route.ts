import { openWorkspace } from "@/lib/onboarding";
import { findByRazorpayOrderId, updateOrder } from "@/lib/orders";
import { fetchPayment, verifyWebhookSignature } from "@/lib/razorpay";

export async function POST(request: Request) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    return Response.json({ error: "Webhook secret is not configured." }, { status: 503 });
  }
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!verifyWebhookSignature(raw, signature)) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
  }
  let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string; status?: string; method?: string } } } };
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return Response.json({ error: "Invalid webhook body." }, { status: 400 });
  }
  if (event.event !== "payment.captured" && event.event !== "payment.authorized") {
    return Response.json({ ok: true });
  }
  const payment = event.payload?.payment?.entity;
  if (!payment?.id || !payment.order_id) return Response.json({ ok: true });
  const order = await findByRazorpayOrderId(payment.order_id);
  if (!order || order.status === "paid") return Response.json({ ok: true });
  const live = await fetchPayment(payment.id);
  const captured = live?.status === "captured" || live?.status === "authorized";
  if (!live || !captured || live.order_id !== order.razorpayOrderId || live.amount !== order.amountPaise || live.currency !== "INR") {
    return Response.json({ ok: true });
  }
  const method = live.method === "card" || live.method === "upi" || live.method === "netbanking" ? live.method : order.paymentMethod;
  const saved = await updateOrder(order.id, {
    status: "paid",
    razorpayPaymentId: live.id,
    paymentMethod: method,
    paidAt: new Date().toISOString(),
  });
  if (saved) await openWorkspace(saved);
  return Response.json({ ok: true });
}

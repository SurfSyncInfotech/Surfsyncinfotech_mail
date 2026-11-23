import { getOrder, updateOrder } from "@/lib/orders";
import { fetchPayment, verifyCheckoutSignature } from "@/lib/razorpay";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  let body: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Payment confirmation was incomplete." }, { status: 400 });
  }
  const orderId = body.razorpay_order_id ?? "";
  const paymentId = body.razorpay_payment_id ?? "";
  const signature = body.razorpay_signature ?? "";
  if (!verifyCheckoutSignature(orderId, paymentId, signature)) {
    return Response.json({ error: "Payment could not be verified." }, { status: 400 });
  }
  const order = await getOrder(id);
  if (!order || order.razorpayOrderId !== orderId) {
    return Response.json({ error: "This payment does not match the checkout." }, { status: 400 });
  }
  if (order.status === "paid") {
    return Response.json({ id: order.id, status: order.status, amountInr: order.amountInr });
  }
  const payment = await fetchPayment(paymentId);
  const captured = payment?.status === "captured" || payment?.status === "authorized";
  if (!payment || !captured || payment.order_id !== orderId || payment.amount !== order.amountPaise || payment.currency !== "INR") {
    await updateOrder(order.id, { status: "failed", razorpayPaymentId: paymentId });
    return Response.json({ error: "The paid amount does not match this plan." }, { status: 400 });
  }
  const method = payment.method === "card" || payment.method === "upi" || payment.method === "netbanking" ? payment.method : order.paymentMethod;
  const saved = await updateOrder(order.id, {
    status: "paid",
    razorpayPaymentId: paymentId,
    paymentMethod: method,
    paidAt: new Date().toISOString(),
  });
  return Response.json({
    id: saved?.id,
    status: "paid",
    amountInr: order.amountInr,
    planName: order.planName,
  });
}

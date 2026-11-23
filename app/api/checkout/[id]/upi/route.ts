import { getOrder, updateOrder } from "@/lib/orders";
import { createRazorpayOrder, createUpiCollect, fetchPayment, razorpayConfigured, validVpa } from "@/lib/razorpay";

type Context = { params: Promise<{ id: string }> };

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "127.0.0.1";
}

async function settle(orderId: string, paymentId: string) {
  const order = await getOrder(orderId);
  if (!order) return Response.json({ error: "This checkout was not found." }, { status: 404 });
  if (order.status === "paid") return Response.json({ status: "paid", id: order.id });
  const payment = await fetchPayment(paymentId);
  const captured = payment?.status === "captured" || payment?.status === "authorized";
  if (payment && captured && payment.order_id === order.razorpayOrderId && payment.amount === order.amountPaise && payment.currency === "INR") {
    await updateOrder(order.id, {
      status: "paid",
      razorpayPaymentId: paymentId,
      paymentMethod: "upi",
      paidAt: new Date().toISOString(),
    });
    return Response.json({ status: "paid", id: order.id });
  }
  if (payment?.status === "failed") {
    return Response.json({ status: "failed", error: "The UPI payment did not go through. You can try again." });
  }
  return Response.json({ status: "pending", id: order.id });
}

export async function POST(request: Request, context: Context) {
  if (!razorpayConfigured()) {
    return Response.json({ error: "UPI is not switched on yet. The company details are saved." }, { status: 503 });
  }
  const { id } = await context.params;
  let body: { vpa?: string; refresh?: boolean } = {};
  try {
    body = (await request.json()) as { vpa?: string; refresh?: boolean };
  } catch {
    return Response.json({ error: "Send the UPI id." }, { status: 400 });
  }
  const order = await getOrder(id);
  if (!order) return Response.json({ error: "This checkout was not found." }, { status: 404 });
  if (order.status === "paid") return Response.json({ status: "paid", id: order.id });

  if (body.refresh) {
    if (!order.razorpayPaymentId) return Response.json({ error: "No UPI request is waiting." }, { status: 400 });
    return settle(order.id, order.razorpayPaymentId);
  }

  const vpa = String(body.vpa ?? "").trim();
  if (!validVpa(vpa)) return Response.json({ error: "Enter a UPI id like name@okaxis." }, { status: 400 });

  const razorpayOrderId = order.razorpayOrderId ?? (await createRazorpayOrder(order));
  if (!razorpayOrderId) return Response.json({ error: "The UPI request could not be sent. Try again." }, { status: 502 });
  await updateOrder(order.id, { razorpayOrderId, paymentMethod: "upi" });

  const created = await createUpiCollect({
    amountPaise: order.amountPaise,
    razorpayOrderId,
    email: order.adminEmail,
    contact: order.contactNumber,
    description: `${order.planName} monthly plan`,
    vpa,
    ip: clientIp(request),
    referer: request.headers.get("referer") || "http://localhost:3000",
    userAgent: request.headers.get("user-agent") || "SurfSync Mail",
  });
  if (!created.ok) return Response.json({ error: created.error }, { status: 502 });
  await updateOrder(order.id, { razorpayOrderId, razorpayPaymentId: created.paymentId, paymentMethod: "upi" });
  return settle(order.id, created.paymentId);
}

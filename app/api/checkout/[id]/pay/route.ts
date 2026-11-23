import { getOrder, updateOrder } from "@/lib/orders";
import { createRazorpayOrder, methodAllowed, razorpayConfigured } from "@/lib/razorpay";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  if (!razorpayConfigured()) {
    return Response.json(
      { error: "Card, UPI, and net banking are not switched on yet. The company details are saved." },
      { status: 503 },
    );
  }
  let body: { method?: string } = {};
  try {
    body = (await request.json()) as { method?: string };
  } catch {
    body = {};
  }
  if (!body.method || !methodAllowed(body.method)) {
    return Response.json({ error: "Choose card, UPI, or net banking." }, { status: 400 });
  }
  const order = await getOrder(id);
  if (!order) return Response.json({ error: "This checkout was not found." }, { status: 404 });
  if (order.status === "paid") return Response.json({ error: "This request is already paid." }, { status: 409 });

  const razorpayOrderId = await createRazorpayOrder(order);
  if (!razorpayOrderId) {
    return Response.json({ error: "The payment desk could not open. Try again." }, { status: 502 });
  }
  const saved = await updateOrder(order.id, { razorpayOrderId, paymentMethod: body.method });
  if (!saved) return Response.json({ error: "This checkout was not found." }, { status: 404 });

  return Response.json({
    keyId: process.env.RAZORPAY_KEY_ID,
    razorpayOrderId,
    amount: saved.amountPaise,
    currency: "INR",
    method: body.method,
    companyName: saved.companyName,
    adminName: saved.adminName,
    adminEmail: saved.adminEmail,
    contactNumber: saved.contactNumber,
    planName: saved.planName,
  });
}

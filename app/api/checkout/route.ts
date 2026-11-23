import { validateCheckout } from "@/lib/checkout";
import { createOrder } from "@/lib/orders";

const hits = new Map<string, number[]>();

function limited(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= 8) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function POST(request: Request) {
  if (limited(request)) {
    return Response.json({ error: "Too many checkout attempts. Wait a minute and try again." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send the company details as JSON." }, { status: 400 });
  }
  const parsed = validateCheckout(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const order = await createOrder(parsed.value);
  if (!order) return Response.json({ error: "Choose a published plan." }, { status: 400 });
  return Response.json({
    id: order.id,
    amountInr: order.amountInr,
    gstPaise: order.gstPaise,
    amountPaise: order.amountPaise,
    currency: order.currency,
    planName: order.planName,
    status: order.status,
  });
}

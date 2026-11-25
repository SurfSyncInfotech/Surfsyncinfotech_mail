import { completeOnboarding } from "@/lib/onboarding";
import { superAdminGate } from "@/lib/guard";

export async function POST(request: Request) {
  const denied = superAdminGate(request);
  if (denied) return denied;
  let body: { paymentId?: unknown } = {};
  const raw = await request.text();
  if (raw.length) {
    try {
      body = JSON.parse(raw) as { paymentId?: unknown };
    } catch {
      return Response.json({ success: false, message: "Request body must be JSON" }, { status: 400 });
    }
  }
  const paymentId = typeof body.paymentId === "string" ? body.paymentId.trim() : "";
  if (!paymentId) return Response.json({ success: false, message: "paymentId is required" }, { status: 400 });
  try {
    const result = await completeOnboarding(paymentId);
    return Response.json(result.body, { status: result.status });
  } catch {
    return Response.json({ success: false, message: "Onboarding service error" }, { status: 500 });
  }
}

import { onboardingStatus } from "@/lib/onboarding";
import { superAdminGate } from "@/lib/guard";

type Context = { params: Promise<{ paymentId: string }> };

export async function GET(request: Request, context: Context) {
  const denied = superAdminGate(request);
  if (denied) return denied;
  const { paymentId } = await context.params;
  try {
    const result = await onboardingStatus(decodeURIComponent(paymentId));
    return Response.json(result.body, { status: result.status });
  } catch {
    return Response.json({ success: false, message: "Onboarding service error" }, { status: 500 });
  }
}

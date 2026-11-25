import { setCompanyStatus } from "@/lib/companies";
import { superAdminGate } from "@/lib/guard";

export async function POST(request: Request) {
  const denied = superAdminGate(request);
  if (denied) return denied;
  let body: Record<string, unknown> = {};
  const raw = await request.text();
  if (raw.length) {
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return Response.json({ success: false, message: "Request body must be JSON" }, { status: 400 });
    }
  }
  try {
    const result = await setCompanyStatus(body);
    return Response.json(result.body, { status: result.status });
  } catch {
    return Response.json({ success: false, message: "Admin service error" }, { status: 500 });
  }
}

import { adminCompanies } from "@/lib/companies";
import { superAdminGate } from "@/lib/guard";

export async function GET(request: Request) {
  const denied = superAdminGate(request);
  if (denied) return denied;
  try {
    return Response.json(await adminCompanies());
  } catch {
    return Response.json({ success: false, message: "Admin service error" }, { status: 500 });
  }
}

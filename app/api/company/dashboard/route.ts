import { companyDashboard } from "@/lib/company-dashboard";

export async function GET(request: Request) {
  try {
    const result = await companyDashboard(request);
    return Response.json(result.body, { status: result.status });
  } catch {
    return Response.json({ success: false, message: "Dashboard service error" }, { status: 500 });
  }
}

import { changePlan } from "@/lib/catalog";
import { authConfigured } from "@/lib/auth";
import { readAuthToken } from "@/lib/token";

export async function POST(request: Request) {
  if (!authConfigured()) {
    return Response.json({ success: false, message: "Plans are not configured." }, { status: 503 });
  }
  const token = readAuthToken(request.headers.get("authorization"));
  if (!token) {
    return Response.json({ success: false, message: "A valid login token is required" }, { status: 401 });
  }
  if (token.role !== "super_admin") {
    return Response.json({ success: false, message: "Only a Super Admin can change plans" }, { status: 403 });
  }
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
    const result = await changePlan(body);
    return Response.json(result.body, { status: result.status });
  } catch {
    return Response.json({ success: false, message: "Plans service error" }, { status: 500 });
  }
}

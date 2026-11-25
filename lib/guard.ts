import { authConfigured } from "@/lib/auth";
import { readAuthToken } from "@/lib/token";

export function superAdminGate(request: Request) {
  if (!authConfigured()) {
    return Response.json({ success: false, message: "Admin is not configured." }, { status: 503 });
  }
  const token = readAuthToken(request.headers.get("authorization"));
  if (!token) {
    return Response.json({ success: false, message: "A valid login token is required" }, { status: 401 });
  }
  if (token.role !== "super_admin") {
    return Response.json({ success: false, message: "Only a Super Admin can view this" }, { status: 403 });
  }
  return null;
}

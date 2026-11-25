import { authConfigured, resetPassword } from "@/lib/auth";

export async function POST(request: Request) {
  if (!authConfigured()) {
    return Response.json({ success: false, message: "Auth is not configured." }, { status: 503 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ success: false, message: "Request body must be JSON" }, { status: 400 });
  }
  try {
    const result = await resetPassword(body);
    return Response.json(result.body, { status: result.status });
  } catch {
    return Response.json({ success: false, message: "Auth service error" }, { status: 500 });
  }
}

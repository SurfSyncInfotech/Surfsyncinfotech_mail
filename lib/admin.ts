import { safeEqual } from "@/lib/orders";

export function adminAuthorized(request: Request) {
  const expected = process.env.ADMIN_API_KEY ?? "";
  if (expected.length < 24) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return false;
  return safeEqual(token, expected);
}

export function adminJson(request: Request, body: unknown, status = 200) {
  const headers = new Headers();
  const allowed = process.env.ADMIN_CORS_ORIGIN;
  const origin = request.headers.get("origin");
  if (allowed && origin === allowed) {
    headers.set("Access-Control-Allow-Origin", allowed);
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Vary", "Origin");
  }
  return Response.json(body, { status, headers });
}

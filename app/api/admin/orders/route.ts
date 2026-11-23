import { adminAuthorized, adminJson } from "@/lib/admin";
import { listOrders, type OrderStatus } from "@/lib/orders";

function ready(request: Request) {
  if ((process.env.ADMIN_API_KEY ?? "").length < 24) {
    return adminJson(request, { error: "Admin API key is not configured." }, 503);
  }
  if (!adminAuthorized(request)) {
    return adminJson(request, { error: "Unauthorized." }, 401);
  }
  return null;
}

export function OPTIONS(request: Request) {
  return adminJson(request, {});
}

export async function GET(request: Request) {
  const denied = ready(request);
  if (denied) return denied;
  const status = new URL(request.url).searchParams.get("status");
  const filter = status === "paid" || status === "pending_payment" || status === "failed" ? (status as OrderStatus) : undefined;
  const orders = await listOrders(filter);
  return adminJson(request, { orders });
}

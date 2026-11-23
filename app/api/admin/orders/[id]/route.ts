import { adminAuthorized, adminJson } from "@/lib/admin";
import { getOrder } from "@/lib/orders";

type Context = { params: Promise<{ id: string }> };

export function OPTIONS(request: Request) {
  return adminJson(request, {});
}

export async function GET(request: Request, context: Context) {
  if ((process.env.ADMIN_API_KEY ?? "").length < 24) {
    return adminJson(request, { error: "Admin API key is not configured." }, 503);
  }
  if (!adminAuthorized(request)) {
    return adminJson(request, { error: "Unauthorized." }, 401);
  }
  const { id } = await context.params;
  const order = await getOrder(id);
  if (!order) return adminJson(request, { error: "Order not found." }, 404);
  return adminJson(request, { order });
}

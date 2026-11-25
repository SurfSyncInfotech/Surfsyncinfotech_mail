import { headers } from "next/headers";
import { listActivePlans } from "@/lib/catalog";
import { authConfigured } from "@/lib/auth";

export async function GET() {
  await headers();
  if (!authConfigured()) {
    return Response.json({ success: false, message: "Plans are not configured." }, { status: 503 });
  }
  try {
    return Response.json(await listActivePlans());
  } catch {
    return Response.json({ success: false, message: "Plans service error" }, { status: 500 });
  }
}

import { resetMailboxPassword } from "@/lib/mailboxes";

export async function POST(request: Request) {
  try {
    const result = await resetMailboxPassword(request);
    return Response.json(result.body, { status: result.status });
  } catch {
    return Response.json({ success: false, message: "Mailbox service error" }, { status: 500 });
  }
}

import { sendMail } from "@/lib/mail";

export async function POST(request: Request) {
  try {
    const result = await sendMail(request);
    return Response.json(result.body, { status: result.status });
  } catch {
    return Response.json({ success: false, message: "Mail service error" }, { status: 500 });
  }
}

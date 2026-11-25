import { readMail } from "@/lib/mail";

export async function POST(request: Request) {
  try {
    const result = await readMail(request);
    return Response.json(result.body, { status: result.status });
  } catch {
    return Response.json({ success: false, message: "Mail service error" }, { status: 500 });
  }
}

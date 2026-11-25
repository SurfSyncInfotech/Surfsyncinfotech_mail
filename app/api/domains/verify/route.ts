import { readDomainBody, verifyDomain } from "@/lib/domains";

export async function POST(request: Request) {
  const parsed = await readDomainBody(request);
  if ("error" in parsed) return parsed.error;
  try {
    const result = await verifyDomain(request, parsed.body);
    return Response.json(result.body, { status: result.status });
  } catch {
    return Response.json({ success: false, message: "Domain service error" }, { status: 500 });
  }
}

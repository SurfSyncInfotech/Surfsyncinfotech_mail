import { createHmac, timingSafeEqual } from "crypto";
import type { AuthRole } from "@/lib/auth";

export type AuthToken = { sub: string; email: string; role: AuthRole; exp: number };

export function readAuthToken(headerValue: string | null) {
  const secret = process.env.AUTH_JWT_SECRET ?? "";
  if (secret.length < 24 || !headerValue?.startsWith("Bearer ")) return null;
  const parts = headerValue.slice(7).trim().split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return null;
  try {
    const body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthToken;
    if (!body?.exp || body.exp < Math.floor(Date.now() / 1000)) return null;
    if (!body.sub || !body.role) return null;
    return body;
  } catch {
    return null;
  }
}

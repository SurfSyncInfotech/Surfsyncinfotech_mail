import type { Plan } from "@/lib/plans";

export type CheckoutInput = {
  planId: Plan["id"];
  companyName: string;
  companyDomain: string;
  adminName: string;
  adminEmail: string;
  contactNumber: string;
};

const domainPattern = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

export function validateCheckout(body: unknown): { ok: true; value: CheckoutInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Send the company details as JSON." };
  const raw = body as Record<string, unknown>;
  const planId = String(raw.planId ?? "");
  if (planId !== "desk" && planId !== "studio" && planId !== "house" && planId !== "hall") {
    return { ok: false, error: "Choose a published plan." };
  }
  const companyName = String(raw.companyName ?? "").trim().replace(/\s+/g, " ");
  if (companyName.length < 2 || companyName.length > 120) {
    return { ok: false, error: "Enter the company name." };
  }
  const companyDomain = normalizeDomain(String(raw.companyDomain ?? ""));
  if (companyDomain.startsWith("www.") || companyDomain.includes("/") || companyDomain.includes("@") || !domainPattern.test(companyDomain)) {
    return { ok: false, error: "Enter the domain only, for example northwind.co." };
  }
  const adminName = String(raw.adminName ?? "").trim().replace(/\s+/g, " ");
  if (adminName.length < 2 || adminName.length > 80) {
    return { ok: false, error: "Enter the admin full name." };
  }
  const adminEmail = String(raw.adminEmail ?? "").trim().toLowerCase();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) && adminEmail.endsWith(`@${companyDomain}`);
  if (!emailOk) {
    return { ok: false, error: `Use a business email on ${companyDomain}.` };
  }
  const digits = String(raw.contactNumber ?? "").replace(/[^\d]/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(local)) {
    return { ok: false, error: "Enter a 10-digit Indian mobile number." };
  }
  return {
    ok: true,
    value: {
      planId,
      companyName,
      companyDomain,
      adminName,
      adminEmail,
      contactNumber: local,
    },
  };
}

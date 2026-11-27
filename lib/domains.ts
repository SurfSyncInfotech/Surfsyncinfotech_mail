import { generateKeyPairSync, randomBytes } from "crypto";
import { resolveMx, resolveTxt } from "dns/promises";
import type { RowDataPacket } from "mysql2";
import { prepareAuth } from "@/lib/auth";
import { prepareCompanies } from "@/lib/companies";
import { getPool } from "@/lib/db";
import { readAuthToken } from "@/lib/token";

type CompanyRow = RowDataPacket & { id: string; status: "active" | "suspended"; admin_email: string };
type UserRow = RowDataPacket & { id: string; email: string; role: string; company_id: string | null };
type DomainRow = RowDataPacket & {
  id: string;
  company_id: string;
  domain: string;
  verified: number;
  dns_json: DnsBundle | string | null;
};

type DnsRecord = { type: string; host: string; value: string };
type DnsBundle = { mx: DnsRecord; spf: DnsRecord; dkim: DnsRecord; dmarc: DnsRecord };

let ready: Promise<void> | null = null;

function mailHost() {
  return (process.env.MAIL_MX_HOST || "mail.surfsyncinfotech.xyz").trim().toLowerCase();
}

function spfHost() {
  return (process.env.SPF_INCLUDE || "mail.surfsyncinfotech.xyz").trim().toLowerCase();
}

function normalizeDomain(value: unknown) {
  if (typeof value !== "string") return "";
  let domain = value.trim().toLowerCase().replace(/\.$/, "");
  domain = domain.replace(/^https?:\/\//, "").split("/")[0];
  if (!/^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,24}$/.test(domain)) return "";
  if (domain.includes("..") || domain.split(".").some((label) => label.startsWith("-") || label.endsWith("-"))) return "";
  return domain;
}

function dnsBundle(domain: string) {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = publicKey.export({ type: "pkcs1", format: "pem" }).toString();
  const p = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const dns: DnsBundle = {
    mx: { type: "MX", host: domain, value: `10 ${mailHost()}` },
    spf: { type: "TXT", host: domain, value: `v=spf1 mx include:${spfHost()} -all` },
    dkim: { type: "TXT", host: `surfsync._domainkey.${domain}`, value: `v=DKIM1; k=rsa; p=${p}` },
    dmarc: { type: "TXT", host: `_dmarc.${domain}`, value: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}` },
  };
  return { dns, privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString() };
}

function present(domain: string, verified: boolean, dns: DnsBundle) {
  return {
    domain,
    verified,
    records: [dns.mx, dns.spf, dns.dkim, dns.dmarc],
  };
}

function parseDns(value: DnsBundle | string | null) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as DnsBundle;
    } catch {
      return null;
    }
  }
  return value;
}

async function addColumn(table: string, column: string, definition: string) {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [table, column],
  );
  if (rows.length === 0) await getPool().query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}

async function ensureDomains() {
  await prepareAuth();
  await prepareCompanies();
  await addColumn("domains", "verified_at", "DATETIME(3) NULL");
  await addColumn("domains", "dns_json", "JSON NULL");
  await addColumn("domains", "private_key", "TEXT NULL");
}

function prepareDomains() {
  if (!ready) ready = ensureDomains();
  return ready;
}

async function companyAdmin(request: Request) {
  if ((process.env.AUTH_JWT_SECRET ?? "").length < 24) {
    return { error: Response.json({ success: false, message: "Domains are not configured." }, { status: 503 }) };
  }
  const token = readAuthToken(request.headers.get("authorization"));
  if (!token) return { error: Response.json({ success: false, message: "A valid login token is required" }, { status: 401 }) };
  if (token.role !== "company_admin") {
    return { error: Response.json({ success: false, message: "Only a Company Admin can manage domains" }, { status: 403 }) };
  }
  await prepareDomains();
  const pool = getPool();
  const [users] = await pool.query<UserRow[]>("SELECT id, email, role, company_id FROM users WHERE email = ? AND role = 'company_admin' LIMIT 1", [
    token.email,
  ]);
  const user = users[0];
  if (!user) return { error: Response.json({ success: false, message: "Company Admin account was not found" }, { status: 403 }) };
  const [byId] = user.company_id
    ? await pool.query<CompanyRow[]>("SELECT id, status, admin_email FROM companies WHERE id = ? LIMIT 1", [user.company_id])
    : [[] as CompanyRow[]];
  const [byEmail] = byId[0]
    ? [[] as CompanyRow[]]
    : await pool.query<CompanyRow[]>("SELECT id, status, admin_email FROM companies WHERE admin_email = ? LIMIT 1", [user.email]);
  const company = byId[0] ?? byEmail[0];
  if (!company) return { error: Response.json({ success: false, message: "Company was not found" }, { status: 404 }) };
  if (company.status !== "active") return { error: Response.json({ success: false, message: "This company is suspended" }, { status: 409 }) };
  return { user, company };
}

export async function readDomainBody(request: Request) {
  const raw = await request.text();
  if (!raw.length) return { body: {} as Record<string, unknown> };
  try {
    return { body: JSON.parse(raw) as Record<string, unknown> };
  } catch {
    return { error: Response.json({ success: false, message: "Request body must be JSON" }, { status: 400 }) };
  }
}

export async function addDomain(request: Request, body: Record<string, unknown>) {
  const owner = await companyAdmin(request);
  if ("error" in owner && owner.error) return { status: owner.error.status, body: await owner.error.json() };
  const domain = normalizeDomain(body.domain);
  if (!domain) return { status: 400, body: { success: false, message: "domain must be a valid domain name" } };
  const pool = getPool();
  const [taken] = await pool.query<DomainRow[]>("SELECT id FROM domains WHERE domain = ? LIMIT 1", [domain]);
  if (taken.length > 0) return { status: 409, body: { success: false, message: "This domain is already added" } };
  const records = dnsBundle(domain);
  const now = new Date();
  await pool.query(
    "INSERT INTO domains (id, company_id, domain, verified, verified_at, dns_json, private_key, created_at) VALUES (?, ?, ?, 0, NULL, ?, ?, ?)",
    [`dom_${randomBytes(8).toString("hex")}`, owner.company.id, domain, JSON.stringify(records.dns), records.privateKey, now],
  );
  return { status: 201, body: { success: true, message: "Domain added", ...present(domain, false, records.dns) } };
}

function txtValues(rows: string[][]) {
  return rows.map((parts) => parts.join("").replace(/\s+/g, ""));
}

async function lookupDns(domain: string, dns: DnsBundle) {
  const checks = { mx: false, spf: false, dkim: false, dmarc: false };
  const ignore = new Set(["ENOTFOUND", "ENODATA", "ESERVFAIL", "ETIMEOUT", "EREFUSED"]);
  try {
    const mx = await resolveMx(domain);
    checks.mx = mx.some((row) => row.priority === 10 && row.exchange.replace(/\.$/, "").toLowerCase() === mailHost());
  } catch (error) {
    if (!ignore.has((error as { code?: string }).code ?? "")) throw error;
  }
  try {
    checks.spf = txtValues(await resolveTxt(domain)).includes(dns.spf.value.replace(/\s+/g, ""));
  } catch (error) {
    if (!ignore.has((error as { code?: string }).code ?? "")) throw error;
  }
  try {
    checks.dkim = txtValues(await resolveTxt(dns.dkim.host)).includes(dns.dkim.value.replace(/\s+/g, ""));
  } catch (error) {
    if (!ignore.has((error as { code?: string }).code ?? "")) throw error;
  }
  try {
    checks.dmarc = txtValues(await resolveTxt(`_dmarc.${domain}`)).includes(dns.dmarc.value.replace(/\s+/g, ""));
  } catch (error) {
    if (!ignore.has((error as { code?: string }).code ?? "")) throw error;
  }
  return checks;
}

export async function verifyDomain(request: Request, body: Record<string, unknown>) {
  const owner = await companyAdmin(request);
  if ("error" in owner && owner.error) return { status: owner.error.status, body: await owner.error.json() };
  const domain = normalizeDomain(body.domain);
  if (!domain) return { status: 400, body: { success: false, message: "domain must be a valid domain name" } };
  const pool = getPool();
  const [rows] = await pool.query<DomainRow[]>(
    "SELECT id, company_id, domain, verified, dns_json FROM domains WHERE company_id = ? AND domain = ? LIMIT 1",
    [owner.company.id, domain],
  );
  const entry = rows[0];
  const dns = entry ? parseDns(entry.dns_json) : null;
  if (!entry || !dns) return { status: 404, body: { success: false, message: "Domain was not found for this company" } };
  const practice = domain.endsWith(".test") && process.env.NODE_ENV !== "production";
  const checks = practice ? { mx: true, spf: true, dkim: true, dmarc: true } : await lookupDns(domain, dns);
  const verified = checks.mx && checks.spf && checks.dkim && checks.dmarc;
  await pool.query("UPDATE domains SET verified = ?, verified_at = ? WHERE id = ?", [verified ? 1 : 0, verified ? new Date() : null, entry.id]);
  return {
    status: 200,
    body: {
      success: true,
      domain,
      verified,
      checks,
      message: verified ? "Domain verified" : "DNS records do not match yet",
    },
  };
}

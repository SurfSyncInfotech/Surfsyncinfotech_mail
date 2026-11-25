import { createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { RowDataPacket } from "mysql2";
import { getPool, mysqlConfigured } from "@/lib/db";

const scryptAsync = promisify(scrypt);
const TOKEN_HOURS = 12;
const RESET_MINUTES = 30;

export type AuthRole = "customer" | "super_admin" | "company_admin" | "employee";

type UserRow = RowDataPacket & {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: AuthRole;
};

type ResetRow = RowDataPacket & {
  id: string;
  user_id: string;
  expires_at: Date;
  used_at: Date | null;
};

let ready: Promise<void> | null = null;

export function authConfigured() {
  return mysqlConfigured() && (process.env.AUTH_JWT_SECRET ?? "").length >= 24;
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 72 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

async function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const actual = (await scryptAsync(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function hashToken(token: string) {
  return createHmac("sha256", process.env.AUTH_JWT_SECRET || "reset").update(token).digest("hex");
}

function present(user: UserRow) {
  return { userId: user.id, name: user.name, email: user.email, role: user.role };
}

function signToken(user: UserRow) {
  const secret = process.env.AUTH_JWT_SECRET ?? "";
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ sub: user.id, email: user.email, role: user.role, iat: now, exp: now + TOKEN_HOURS * 60 * 60 }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

async function ensureTables() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(32) NOT NULL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(160) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('customer','super_admin','company_admin','employee') NOT NULL,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      UNIQUE KEY users_email (email)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id VARCHAR(32) NOT NULL PRIMARY KEY,
      user_id VARCHAR(32) NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME(3) NOT NULL,
      used_at DATETIME(3) NULL,
      KEY resets_token (token_hash),
      KEY resets_user (user_id)
    )
  `);
  const email = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD ?? "";
  if (!email || !validPassword(password)) return;
  const [rows] = await pool.query<UserRow[]>("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (rows.length > 0) return;
  const now = new Date();
  await pool.query(
    "INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, 'super_admin', ?, ?)",
    [`usr_${randomBytes(8).toString("hex")}`, "SurfSync Super Admin", email, await hashPassword(password), now, now],
  );
}

export function prepareAuth() {
  if (!ready) ready = ensureTables();
  return ready;
}

export async function registerAccount(body: Record<string, unknown>) {
  const name = clean(body.name, 120);
  const email = clean(body.email, 160).toLowerCase();
  if (!name) return { status: 400, body: { success: false, message: "name is required" } };
  if (!validEmail(email)) return { status: 400, body: { success: false, message: "email must be a valid email" } };
  if (!validPassword(body.password)) {
    return { status: 400, body: { success: false, message: "password must be 8 to 72 characters and include a letter and a number" } };
  }
  await prepareAuth();
  const pool = getPool();
  const [existing] = await pool.query<UserRow[]>("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (existing.length > 0) return { status: 409, body: { success: false, message: "An account with this email already exists" } };
  const now = new Date();
  const userId = `usr_${randomBytes(8).toString("hex")}`;
  await pool.query(
    "INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, 'customer', ?, ?)",
    [userId, name, email, await hashPassword(body.password), now, now],
  );
  return { status: 201, body: { success: true, message: "Account created", user: { userId, name, email, role: "customer" } } };
}

export async function loginAccount(body: Record<string, unknown>) {
  const email = clean(body.email, 160).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  await prepareAuth();
  const pool = getPool();
  const [rows] = await pool.query<UserRow[]>("SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1", [email]);
  const user = rows[0];
  const matches = await checkPassword(password, user?.password_hash ?? (await hashPassword("dummy-password")));
  if (!user || !matches || !password) return { status: 401, body: { success: false, message: "Email or password is incorrect" } };
  return { status: 200, body: { success: true, message: "Login successful", token: signToken(user), user: present(user) } };
}

export async function resetPassword(body: Record<string, unknown>) {
  const token = clean(body.resetToken, 200);
  const password = body.password;
  if (token || typeof password === "string") {
    if (!token || !validPassword(password)) {
      if (!token || typeof password !== "string") {
        return { status: 400, body: { success: false, message: "resetToken and password are both required to set a new password" } };
      }
      return { status: 400, body: { success: false, message: "password must be 8 to 72 characters and include a letter and a number" } };
    }
    await prepareAuth();
    const pool = getPool();
    const [resets] = await pool.query<ResetRow[]>(
      "SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = ? AND used_at IS NULL LIMIT 1",
      [hashToken(token)],
    );
    const reset = resets[0];
    if (!reset || new Date(reset.expires_at).getTime() < Date.now()) {
      return { status: 400, body: { success: false, message: "Reset token is invalid or expired" } };
    }
    const [users] = await pool.query<UserRow[]>("SELECT id, password_hash FROM users WHERE id = ? LIMIT 1", [reset.user_id]);
    const user = users[0];
    if (!user) return { status: 400, body: { success: false, message: "Reset token is invalid or expired" } };
    if (await checkPassword(password, user.password_hash)) {
      return { status: 400, body: { success: false, message: "New password must be different from the current password" } };
    }
    const now = new Date();
    await pool.query("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", [await hashPassword(password), now, user.id]);
    await pool.query("UPDATE password_resets SET used_at = ? WHERE id = ?", [now, reset.id]);
    return { status: 200, body: { success: true, message: "Password updated" } };
  }

  const email = clean(body.email, 160).toLowerCase();
  if (!validEmail(email)) return { status: 400, body: { success: false, message: "email must be a valid email" } };
  await prepareAuth();
  const pool = getPool();
  const [users] = await pool.query<UserRow[]>("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  const message = "If this email is registered, the reset token is ready.";
  const response: { success: true; message: string; resetToken?: string } = { success: true, message };
  const user = users[0];
  if (!user) return { status: 200, body: response };
  const now = new Date();
  await pool.query("UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL", [now, user.id]);
  const resetToken = randomBytes(24).toString("hex");
  await pool.query("INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)", [
    `rst_${randomBytes(8).toString("hex")}`,
    user.id,
    hashToken(resetToken),
    new Date(now.getTime() + RESET_MINUTES * 60 * 1000),
  ]);
  if (process.env.RETURN_RESET_TOKEN === "true") response.resetToken = resetToken;
  return { status: 200, body: response };
}

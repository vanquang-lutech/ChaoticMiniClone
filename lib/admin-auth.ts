import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "chaotic_admin_session";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 8;

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET;
}

function sign(value: string) {
  const secret = sessionSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function securelyMatches(first: string, second: string) {
  const firstHash = createHash("sha256").update(first).digest();
  const secondHash = createHash("sha256").update(second).digest();
  return timingSafeEqual(firstHash, secondHash);
}

export function validateAdminCredentials(username: string, password: string) {
  const configuredUsername = process.env.ADMIN_USERNAME;
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredUsername || !configuredPassword || !sessionSecret()) return false;

  return securelyMatches(username, configuredUsername) && securelyMatches(password, configuredPassword);
}

export function createAdminSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS;
  const payload = `admin.${expiresAt}`;
  const signature = sign(payload);
  return signature ? `${payload}.${signature}` : null;
}

export function isValidAdminSession(session: string | undefined) {
  if (!session) return false;
  const [role, expiresAtRaw, signature, ...rest] = session.split(".");
  if (role !== "admin" || !expiresAtRaw || !signature || rest.length > 0) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;

  const expectedSignature = sign(`${role}.${expiresAtRaw}`);
  return expectedSignature ? securelyMatches(signature, expectedSignature) : false;
}

export const adminSessionCookieOptions = {
  httpOnly: true,
  maxAge: SESSION_LIFETIME_SECONDS,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

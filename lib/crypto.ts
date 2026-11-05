import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Pure crypto helpers. Kept apart from lib/auth.ts so scripts and tests can import them without Next.

/** 32 random bytes, base64url: review links and MCP keys. */
export const newToken = () => randomBytes(32).toString("base64url");

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `scrypt:${salt.toString("base64url")}:${scryptSync(password, salt, 64).toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  return timingSafeEqual(scryptSync(password, Buffer.from(salt, "base64url"), expected.length), expected);
}

const hmac = (data: string, secret: string) => createHmac("sha256", secret).update(data).digest("base64url");

/** Session token: base64url(JSON {uid, exp}) + "." + HMAC-SHA256 of that part. */
export function signSession(userId: string, secret: string, ttlMs: number, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ uid: userId, exp: now + ttlMs })).toString("base64url");
  return `${body}.${hmac(body, secret)}`;
}

/** Returns the user id, or null if the token is malformed, forged or expired. */
export function verifySession(token: string, secret: string, now = Date.now()): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const given = Buffer.from(sig);
  const expected = Buffer.from(hmac(body, secret));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return typeof uid === "string" && typeof exp === "number" && exp > now ? uid : null;
  } catch {
    return null;
  }
}

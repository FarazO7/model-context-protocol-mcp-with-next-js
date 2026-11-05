import { describe, expect, it } from "vitest";
import { hashPassword, newToken, signSession, verifyPassword, verifySession } from "./crypto";

const SECRET = "test-secret-that-is-at-least-32-characters";
const HOUR = 60 * 60 * 1000;

describe("passwords", () => {
  const stored = hashPassword("correct horse");

  it("accepts the right password", () => expect(verifyPassword("correct horse", stored)).toBe(true));
  it("rejects a wrong password", () => expect(verifyPassword("wrong horse", stored)).toBe(false));
  it("rejects a malformed hash", () => expect(verifyPassword("correct horse", "plain-text")).toBe(false));
  it("salts each hash", () => expect(hashPassword("correct horse")).not.toBe(stored));
});

describe("sessions", () => {
  const now = Date.UTC(2026, 10, 6);
  const token = signSession("user-1", SECRET, HOUR, now);

  it("round-trips the user id", () => expect(verifySession(token, SECRET, now)).toBe("user-1"));
  it("rejects an expired token", () => expect(verifySession(token, SECRET, now + HOUR + 1)).toBeNull());
  it("rejects a different secret", () => expect(verifySession(token, `${SECRET}x`, now)).toBeNull());

  it("rejects a tampered payload", () => {
    const [, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "admin", exp: now + HOUR })).toString("base64url");
    expect(verifySession(`${forged}.${sig}`, SECRET, now)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    for (const bad of ["", "abc", `${token}.extra`, "a.b"]) expect(verifySession(bad, SECRET, now)).toBeNull();
  });
});

it("makes 32-byte base64url tokens", () => {
  const t = newToken();
  expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(Buffer.from(t, "base64url")).toHaveLength(32);
});

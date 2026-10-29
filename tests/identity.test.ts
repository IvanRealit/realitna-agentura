import { afterEach, describe, expect, it } from "vitest";
import {
  base32,
  totp,
  verifyTotp,
  sealSecret,
  openSecret,
} from "../src/modules/identity/totp";
import { passwordSchema } from "../src/modules/identity/validation";
const secret = base32(Buffer.from("12345678901234567890"));
const original = process.env.MFA_ENCRYPTION_KEY;
afterEach(() => {
  if (original === undefined) delete process.env.MFA_ENCRYPTION_KEY;
  else process.env.MFA_ENCRYPTION_KEY = original;
});
describe("TOTP RFC 6238 SHA1 vectors", () => {
  it.each([
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
    [20000000000, "65353130"],
  ])("matches RFC time %s", (time, code) =>
    expect(totp(secret, Math.floor(Number(time) / 30), 8)).toBe(code),
  );
  it("accepts only numeric six-digit codes within one step", () => {
    expect(verifyTotp(secret, totp(secret, 100), 3000000)).toBe(100);
    expect(verifyTotp(secret, totp(secret, 99), 3000000)).toBe(99);
    expect(verifyTotp(secret, totp(secret, 98), 3000000)).toBeNull();
    expect(verifyTotp(secret, "00000x", 3000000)).toBeNull();
  });
});
describe("MFA secret custody", () => {
  it("requires a real configured encryption key", () => {
    delete process.env.MFA_ENCRYPTION_KEY;
    expect(() => sealSecret(secret)).toThrow("MFA_ENCRYPTION_KEY");
  });
  it("encrypts with unique nonces and authenticates ciphertext", () => {
    process.env.MFA_ENCRYPTION_KEY = "22".repeat(32);
    const sealed = sealSecret(secret);
    expect(sealed).not.toContain(secret);
    expect(sealSecret(secret)).not.toBe(sealed);
    expect(openSecret(sealed)).toBe(secret);
    const parts = sealed.split(".");
    const bytes = Buffer.from(parts[3], "base64url");
    bytes[0] ^= 1;
    parts[3] = bytes.toString("base64url");
    expect(() => openSecret(parts.join("."))).toThrow();
  });
  it("rejects the wrong recovery key", () => {
    process.env.MFA_ENCRYPTION_KEY = "22".repeat(32);
    const value = sealSecret(secret);
    process.env.MFA_ENCRYPTION_KEY = "33".repeat(32);
    expect(() => openSecret(value)).toThrow();
  });
});
describe("password hashing boundaries", () => {
  it("rejects bcrypt truncation including multibyte passwords", () => {
    expect(passwordSchema.safeParse("a".repeat(73)).success).toBe(false);
    expect(passwordSchema.safeParse("ї".repeat(37)).success).toBe(false);
    expect(passwordSchema.safeParse("a".repeat(72)).success).toBe(true);
    expect(passwordSchema.safeParse("short").success).toBe(false);
  });
});

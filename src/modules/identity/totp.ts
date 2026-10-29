import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function base32(buffer: Uint8Array) {
  let out = "",
    bits = 0,
    value = 0;
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}
function decode(secret: string) {
  let bits = 0,
    value = 0;
  const bytes = [];
  for (const c of secret) {
    const index = alphabet.indexOf(c);
    if (index < 0) throw new Error("Invalid TOTP secret");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}
export const newTotpSecret = () => base32(randomBytes(20));
export function totp(secret: string, counter: number, digits = 6) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", decode(secret)).update(message).digest();
  const offset = hmac[19] & 15;
  const n = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;
  return String(n).padStart(digits, "0");
}
export function verifyTotp(secret: string, code: string, time = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null;
  const counter = Math.floor(time / 30000);
  for (const delta of [0, -1, 1]) {
    const step = counter + delta;
    if (
      step >= 0 &&
      timingSafeEqual(Buffer.from(totp(secret, step)), Buffer.from(code))
    )
      return step;
  }
  return null;
}
function key() {
  const raw = process.env.MFA_ENCRYPTION_KEY;
  if (!raw || !/^[a-f0-9]{64}$/i.test(raw))
    throw new Error("MFA_ENCRYPTION_KEY must be configured as 32-byte hex");
  return Buffer.from(raw, "hex");
}
export function sealSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from("realitna:mfa:v1"));
  const value = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    value.toString("base64url"),
  ].join(".");
}
export function openSecret(value: string) {
  const [version, iv, tag, data] = value.split(".");
  if (version !== "v1" || !iv || !tag || !data)
    throw new Error("Invalid encrypted secret");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAAD(Buffer.from("realitna:mfa:v1"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

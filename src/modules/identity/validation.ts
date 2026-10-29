import { z } from "zod";
export const passwordSchema = z
  .string()
  .min(12)
  .max(72)
  .refine(
    (v) => Buffer.byteLength(v, "utf8") <= 72,
    "Password must fit bcrypt's 72 UTF-8 byte limit",
  );

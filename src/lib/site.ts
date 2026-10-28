import { db } from "./db";
import { cache } from "react";
export const siteSettings = cache(
  async () =>
    (await db.settings.findUnique({ where: { id: "site" } })) ?? {
      brand: "DOMOV",
      email: "hello@example.invalid",
      phone: "",
      address: "Slovensko — DEMO",
      retentionDays: 180,
    },
);
export const siteUrl = () =>
  new URL(process.env.SITE_URL ?? "http://localhost:3000");
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

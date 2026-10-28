import { describe, it, expect } from "vitest";
import { filters, pageNumber } from "../src/lib/catalog";
import { propertySchema, leadSchema } from "../src/lib/validation";
import { href, translation, routeKey, locales, routes } from "../src/lib/i18n";
import { UnconfiguredCrmAdapter } from "../src/lib/crm";
describe("catalog and localization", () => {
  it("never exposes drafts through filters", () =>
    expect(filters({ city: "Bratislava", transaction: "RENT" })).toEqual({
      status: { in: ["PUBLISHED", "RESERVED", "SOLD", "RENTED"] },
      city: { equals: "Bratislava", mode: "insensitive" },
      transaction: "RENT",
    }));
  it("validates numeric ranges and ignores invalid input", () => {
    expect(
      filters({ minPrice: "100", maxPrice: "300", rooms: "2" }),
    ).toMatchObject({ price: { gte: 100, lte: 300 }, rooms: 2 });
    expect(filters({ minPrice: "NaN", minArea: "-20" })).not.toHaveProperty(
      "price",
    );
  });
  it("bounds pagination", () => {
    expect(pageNumber("-5")).toBe(1);
    expect(pageNumber("999999")).toBe(10000);
    expect(pageNumber("2.5")).toBe(2);
  });
  it("round trips all localized route keys", () => {
    for (const l of locales)
      for (const key of Object.keys(routes) as (keyof typeof routes)[]) {
        expect(routeKey(l, href(l, key).split("/")[2])).toBe(key);
      }
  });
  it("falls back to Slovak without leaking undefined strings", () => {
    expect(
      translation({ sk: { title: "Dom", description: "Opis" } }, "uk"),
    ).toEqual({ title: "Dom", description: "Opis" });
    expect(translation(null, "en")).toEqual({ title: "", description: "" });
  });
});
const lead = {
  name: "DEMO Test",
  email: "test@example.invalid",
  message: "A valid demonstration inquiry",
  kind: "VIEWING",
  locale: "sk",
  consent: true,
};
describe("input validation", () => {
  it("requires explicit privacy consent", () =>
    expect(leadSchema.safeParse({ ...lead, consent: false }).success).toBe(
      false,
    ));
  it("rejects honeypot and oversized input", () => {
    expect(
      leadSchema.safeParse({ ...lead, website: "spam.invalid" }).success,
    ).toBe(false);
    expect(
      leadSchema.safeParse({ ...lead, message: "x".repeat(5001) }).success,
    ).toBe(false);
  });
  it("accepts a legitimate lead", () =>
    expect(leadSchema.safeParse(lead).success).toBe(true));
  it("rejects executable or non HTTPS media URLs", () => {
    const base = {
      slug: "demo-test",
      translations: {
        sk: { title: "DEMO Test", description: "Demonstration property only" },
      },
      city: "Nitra",
      region: "Nitriansky kraj",
      address: "DEMO Nitra",
      type: "HOUSE",
      transaction: "SALE",
      condition: "NEW",
      price: 1,
      area: 10,
      rooms: 1,
      status: "DRAFT",
      demo: true,
      featured: false,
      images: [],
      agentId: "demo",
    };
    expect(
      propertySchema.safeParse({ ...base, tourUrl: "javascript:alert(1)" })
        .success,
    ).toBe(false);
    expect(
      propertySchema.safeParse({ ...base, images: ["/uploads/demo.webp"] })
        .success,
    ).toBe(true);
  });
  it("does not pretend CRM is connected", async () =>
    await expect(new UnconfiguredCrmAdapter().exportLead()).rejects.toThrow(
      "Official API documentation",
    ));
});

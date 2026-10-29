import { describe, it, expect } from "vitest";
import {
  can,
  ownsRecord,
  staffNavigation,
  type Resource,
} from "../src/modules/access/policy";
import {
  expectedVersion,
  publicationIssues,
} from "../src/modules/properties/rules";
describe("central permissions: current three-role compatibility contract", () => {
  it("denies agents publishing, reassignment, deletion and user administration", () => {
    for (const action of ["publish", "assign", "delete"] as const)
      expect(can("AGENT", "properties", action)).toBe(false);
    expect(can("AGENT", "users", "read")).toBe(false);
    expect(can("AGENT", "leads", "assign")).toBe(false);
    expect(can("AGENT", "properties", "create")).toBe(true);
  });
  it("allows company managers to review/publish but not change company security/settings", () => {
    expect(can("MANAGER", "properties", "publish")).toBe(true);
    expect(can("MANAGER", "content", "update")).toBe(true);
    for (const r of ["users", "settings", "audit"] as const)
      expect(can("MANAGER", r, "read")).toBe(false);
    expect(can("MANAGER", "leads", "delete")).toBe(false);
  });
  it("allows admin security administration and lead deletion, not deleting users/audit", () => {
    expect(can("ADMIN", "users", "update")).toBe(true);
    expect(can("ADMIN", "leads", "delete")).toBe(true);
    expect(can("ADMIN", "users", "delete")).toBe(false);
    expect(can("ADMIN", "audit", "delete")).toBe(false);
  });
  it("denies unsupported future roles and prototype keys until migrated/tested", () => {
    for (const role of [
      "SUPER_ADMIN",
      "BRANCH_MANAGER",
      "ACCOUNTANT",
      "AUDITOR",
      "__proto__",
      "toString",
    ]) {
      expect(can(role, "properties", "read")).toBe(false);
      expect(staffNavigation(role)).toEqual([]);
      expect(ownsRecord(role, "a", "a")).toBe(false);
    }
    expect(can("ADMIN", "__proto__" as Resource, "read")).toBe(false);
  });
  it("enforces own-agent scope and derives navigation from effective rights", () => {
    expect(ownsRecord("AGENT", "a", "b")).toBe(false);
    expect(ownsRecord("AGENT", "a", "a")).toBe(true);
    expect(ownsRecord("MANAGER", "a", "b")).toBe(true);
    expect(staffNavigation("AGENT")).toEqual([
      "dashboard",
      "properties",
      "leads",
    ]);
    expect(staffNavigation("MANAGER")).not.toContain("settings");
  });
});
describe("property write preconditions and publication quality", () => {
  it("requires an explicit version for existing writes", () =>
    expect(() => expectedVersion({}, null)).toThrow("include its version"));
  it("accepts a body or quoted If-Match version and rejects conflicting inputs", () => {
    expect(expectedVersion({ version: 2 }, null)).toBe(2);
    expect(expectedVersion(null, '"2"')).toBe(2);
    expect(() => expectedVersion({ version: 2 }, '"3"')).toThrow("conflicting");
  });
  it.each([0, -1, "1", 1.5, 2147483647])(
    "rejects invalid body version %s",
    (version) => expect(() => expectedVersion({ version }, null)).toThrow(),
  );
  it("rejects wildcard and weak/malformed ETags", () => {
    for (const v of ["*", 'W/"1"', "1", '"1","2"'])
      expect(() => expectedVersion(null, v)).toThrow();
  });
  it("requires an image, positive price and useful Slovak text for publication", () => {
    expect(
      publicationIssues({
        price: 0,
        images: [],
        translations: { sk: { description: "Too short" } },
      }),
    ).toHaveLength(3);
    expect(
      publicationIssues({
        price: 1,
        images: ["/images/living.webp"],
        translations: {
          sk: {
            description:
              "A clear Slovak demonstration description with sufficient detail.",
          },
        },
      }),
    ).toEqual([]);
  });
});

describe("property service safety before any database transaction", () => {
  it("cannot delete or patch a collection when a caller omits the ID", async () => {
    const { writeProperty } = await import("../src/modules/properties/service");
    for (const method of ["PATCH", "DELETE"] as const)
      await expect(
        writeProperty(
          { id: "test-actor", role: "ADMIN" },
          method,
          undefined,
          {},
          '"1"',
        ),
      ).rejects.toMatchObject({ status: 400 });
  });
});

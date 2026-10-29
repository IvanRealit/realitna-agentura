import { describe, it, expect } from "vitest";
import {
  can,
  ownsRecord,
  staffNavigation,
  type Resource,
  recordScope,
  inScope,
} from "../src/modules/access/policy";
import {
  expectedVersion,
  publicationIssues,
} from "../src/modules/properties/rules";
describe("central permissions: enterprise and legacy compatibility", () => {
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
  it("denies unknown roles and prototype keys", () => {
    for (const role of ["UNKNOWN_ROLE", "__proto__", "toString"]) {
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
      "branches",
      "security",
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

describe("enterprise branch access", () => {
  it("requires a branch for scoped managers and coordinators", () => {
    for (const role of ["BRANCH_MANAGER", "COORDINATOR"]) {
      expect(recordScope({ id: "a", role })).toEqual({ id: "__no_access__" });
      expect(inScope({ id: "a", role }, { agentId: "b", branchId: null })).toBe(
        false,
      );
      expect(recordScope({ id: "a", role, branchId: "north" })).toEqual({
        branchId: "north",
      });
      expect(
        inScope(
          { id: "a", role, branchId: "north" },
          { agentId: "b", branchId: "south" },
        ),
      ).toBe(false);
      expect(
        inScope(
          { id: "a", role, branchId: "north" },
          { agentId: "b", branchId: "north" },
        ),
      ).toBe(true);
    }
  });
  it("denies all auditor mutations and accountant inventory access", () => {
    for (const action of [
      "create",
      "update",
      "delete",
      "approve",
      "export",
      "publish",
      "assign",
    ] as const)
      expect(can("AUDITOR", "properties", action)).toBe(false);
    expect(can("AUDITOR", "properties", "read")).toBe(true);
    expect(can("ACCOUNTANT", "properties", "read")).toBe(false);
    expect(recordScope({ id: "a", role: "ACCOUNTANT" })).toEqual({
      id: "__no_access__",
    });
  });
  it("only branch managers approve, coordinators cannot publish or administer users", () => {
    expect(can("BRANCH_MANAGER", "properties", "approve")).toBe(true);
    expect(can("COORDINATOR", "properties", "publish")).toBe(false);
    expect(can("COORDINATOR", "users", "update")).toBe(false);
  });
});

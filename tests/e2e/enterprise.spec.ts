import {
  test,
  expect,
  request,
  type APIRequestContext,
} from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { hash, compare } from "bcryptjs";
import type { Role } from "@prisma/client";
import { db } from "../../src/lib/db";
import { assertIsolatedTestProcess } from "../../src/config/test-environment";
import { totp } from "../../src/modules/identity/totp";
assertIsolatedTestProcess();
const suffix = randomUUID().slice(0, 8),
  password = randomBytes(24).toString("hex"),
  base = process.env.TEST_BASE_URL!;
const ids: Record<string, string> = {},
  contexts: Record<string, APIRequestContext> = {};
const branchIds: string[] = [];
let sequence = 1;
const email = (key: string) => `enterprise-${key}-${suffix}@example.invalid`;
async function context() {
  return request.newContext({
    baseURL: base,
    extraHTTPHeaders: {
      Origin: base,
      "x-forwarded-for": `127.221.${parseInt(suffix.slice(0, 2), 16)}.${sequence++}`,
    },
  });
}
async function auth(key: string, code = "", pass = password) {
  const ctx = await context();
  const response = await ctx.post("/api/auth/login", {
    data: { email: email(key), password: pass, code },
  });
  return { ctx, response };
}
const record = (agentId: string, slug: string) => ({
  slug,
  translations: {
    sk: {
      title: "DEMO enterprise property",
      description:
        "DEMO test property with sufficient descriptive text for publication.",
    },
  },
  city: "DEMO City",
  region: "DEMO Region",
  address: "DEMO no real address",
  type: "APARTMENT",
  transaction: "SALE",
  condition: "NEW",
  price: 100000,
  area: 50,
  rooms: 2,
  status: "DRAFT",
  demo: true,
  featured: false,
  images: ["/images/living.webp"],
  agentId,
});
test.beforeAll(async () => {
  const passwordHash = await hash(password, 12);
  for (const name of ["North", "South", "Empty"]) {
    const branch = await db.branch.create({
      data: { name: `DEMO ${name} ${suffix}`, city: "DEMO City" },
    });
    branchIds.push(branch.id);
  }
  const roles: Record<string, Role> = {
    owner: "SUPER_ADMIN",
    admin: "ADMIN",
    manager: "BRANCH_MANAGER",
    coordinator: "COORDINATOR",
    a: "AGENT",
    b: "AGENT",
    auditor: "AUDITOR",
    accountant: "ACCOUNTANT",
    mfa: "ADMIN",
    invite: "AGENT",
    reset: "AGENT",
    change: "AGENT",
    nobranch: "BRANCH_MANAGER",
  };
  for (const [key, role] of Object.entries(roles)) {
    const user = await db.user.create({
      data: {
        email: email(key),
        name: `DEMO ${key} ${suffix}`,
        role,
        passwordHash,
        active: key !== "invite",
        branchId: ["manager", "coordinator", "a"].includes(key)
          ? branchIds[0]
          : key === "b"
            ? branchIds[1]
            : null,
      },
    });
    ids[key] = user.id;
    if (key !== "invite") {
      const { ctx, response } = await auth(key);
      expect(response.status()).toBe(200);
      contexts[key] = ctx;
    }
  }
});
test.afterAll(async () => {
  const users = Object.values(ids);
  await db.lead.deleteMany({
    where: {
      OR: [
        { email: { endsWith: `-${suffix}@example.invalid` } },
        { agentId: { in: users } },
      ],
    },
  });
  await db.property.deleteMany({ where: { agentId: { in: users } } });
  await db.auditLog.deleteMany({ where: { actorId: { in: users } } });
  await db.loginEvent.deleteMany({ where: { userId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.branch.deleteMany({ where: { id: { in: branchIds } } });
  for (const ctx of Object.values(contexts)) await ctx.dispose();
  await db.$disconnect();
});
test("branch scopes apply to property lists, direct IDs, assignment, intake and dashboard", async () => {
  const admin = contexts.admin,
    manager = contexts.manager;
  const a = await admin.post("/api/admin/properties", {
    data: record(ids.a, `enterprise-a-${suffix}`),
  });
  expect(a.status()).toBe(201);
  const first = await a.json();
  expect(first.branchId).toBe(branchIds[0]);
  const b = await admin.post("/api/admin/properties", {
    data: record(ids.b, `enterprise-b-${suffix}`),
  });
  expect(b.status()).toBe(201);
  const second = await b.json();
  const visible = await (await manager.get("/api/admin/properties")).json();
  expect(visible.map((r: { id: string }) => r.id)).toContain(first.id);
  expect(
    visible.every((r: { branchId: string }) => r.branchId === branchIds[0]),
  ).toBe(true);
  expect(
    await (await manager.get(`/api/admin/properties/${second.id}`)).json(),
  ).toEqual([]);
  expect(
    await (
      await contexts.nobranch.get(`/api/admin/properties/${second.id}`)
    ).json(),
  ).toEqual([]);
  expect(
    await (
      await manager.get(`/api/admin/properties?branchId=${branchIds[1]}`)
    ).json(),
  ).toEqual([]);
  expect(
    (
      await manager.patch(`/api/admin/properties/${second.id}`, {
        data: { ...second, price: 2 },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await manager.patch(`/api/admin/properties/${first.id}`, {
        data: { ...first, agentId: ids.b },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await contexts.coordinator.patch(`/api/admin/properties/${first.id}`, {
        data: { ...first, status: "PUBLISHED" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (await contexts.a.get(`/api/admin/properties/${second.id}`)).status(),
  ).toBe(200);
  expect(
    await (await contexts.a.get(`/api/admin/properties/${second.id}`)).json(),
  ).toEqual([]);
  expect(
    (
      await contexts.a.patch(`/api/admin/properties/${second.id}`, {
        data: second,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await contexts.a.patch(`/api/admin/properties/${first.id}`, {
        data: { ...first, price: 120000 },
      })
    ).status(),
  ).toBe(200);
  const current = await db.property.findUniqueOrThrow({
    where: { id: first.id },
  });
  expect(
    (
      await manager.patch(`/api/admin/properties/${first.id}`, {
        data: { ...first, version: current.version, status: "REVIEW" },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await manager.patch(`/api/admin/properties/${first.id}`, {
        data: { ...first, version: current.version + 1, status: "PUBLISHED" },
      })
    ).status(),
  ).toBe(200);
  const publicContext = await context();
  expect(
    (
      await publicContext.post("/api/leads", {
        data: {
          name: "DEMO enterprise inquiry",
          email: email("lead"),
          message: "DEMO inquiry persisted and scoped by property",
          kind: "VIEWING",
          locale: "sk",
          consent: true,
          propertyId: first.id,
        },
      })
    ).status(),
  ).toBe(201);
  await publicContext.dispose();
  const lead = await db.lead.findFirstOrThrow({
    where: { email: email("lead") },
  });
  expect(lead.branchId).toBe(branchIds[0]);
  expect((await manager.get(`/api/admin/leads/${lead.id}`)).status()).toBe(200);
  expect(
    await (await contexts.b.get(`/api/admin/leads/${lead.id}`)).json(),
  ).toEqual([]);
  expect(
    (
      await contexts.b.patch(`/api/admin/leads/${lead.id}`, {
        data: { status: "CLOSED", notes: "no access" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await manager.patch(`/api/admin/leads/${lead.id}`, {
        data: { status: "IN_PROGRESS", notes: "DEMO", agentId: ids.b },
      })
    ).status(),
  ).toBe(403);
  expect(
    (await contexts.a.get(`/api/admin/branches/${branchIds[1]}`)).status(),
  ).toBe(200);
  expect(
    await (await contexts.a.get(`/api/admin/branches/${branchIds[1]}`)).json(),
  ).toEqual([]);
});
test("role escalation, blocks, read-only roles and safe branch lifecycle", async () => {
  const admin = contexts.admin;
  const target = await (await admin.get(`/api/admin/users`)).json();
  const b = target.find((u: { id: string }) => u.id === ids.b);
  expect(JSON.stringify(target)).not.toMatch(
    /passwordHash|mfaSecret|recoveryHashes|authVersion/,
  );
  expect(
    (
      await admin.patch(`/api/admin/users/${ids.owner}`, {
        data: { ...b, email: email("owner"), role: "SUPER_ADMIN" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await admin.post("/api/admin/users", {
        data: {
          ...b,
          email: email("escalation"),
          password,
          role: "SUPER_ADMIN",
        },
      })
    ).status(),
  ).toBe(403);
  expect((await contexts.a.get("/api/admin/users")).status()).toBe(403);
  expect(
    (
      await contexts.a.post("/api/admin/branches", {
        data: { name: "DEMO forbidden", city: "DEMO" },
      })
    ).status(),
  ).toBe(403);
  for (const role of ["auditor", "accountant"]) {
    expect(
      (
        await contexts[role].post("/api/admin/properties", {
          data: record(ids.a, `enterprise-no-${role}-${suffix}`),
        })
      ).status(),
    ).toBe(403);
  }
  expect(
    (await contexts.accountant.get("/api/admin/properties")).status(),
  ).toBe(403);
  expect((await contexts.auditor.get("/api/admin/properties")).status()).toBe(
    200,
  );
  expect(
    (
      await admin.patch(`/api/admin/users/${ids.b}`, {
        data: { ...b, active: false },
      })
    ).status(),
  ).toBe(200);
  expect((await contexts.b.get("/api/admin/properties")).status()).toBe(401);
  const retry = await auth("b");
  expect(retry.response.status()).toBe(401);
  await retry.ctx.dispose();
  expect(
    (
      await admin.patch(`/api/admin/users/${ids.b}`, {
        data: { ...b, active: true },
      })
    ).status(),
  ).toBe(200);
  const branch = await db.branch.findUniqueOrThrow({
    where: { id: branchIds[0] },
  });
  expect(
    (
      await admin.patch(`/api/admin/branches/${branch.id}`, {
        data: { ...branch, active: false },
      })
    ).status(),
  ).toBe(409);
  const employee = target.find((u: { id: string }) => u.id === ids.a);
  expect(
    (
      await admin.patch(`/api/admin/users/${ids.a}`, {
        data: { ...employee, branchId: branchIds[1] },
      })
    ).status(),
  ).toBe(409);
  const empty = await db.branch.findUniqueOrThrow({
    where: { id: branchIds[2] },
  });
  expect(
    (
      await admin.patch(`/api/admin/branches/${empty.id}`, {
        data: { ...empty, active: false },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await admin.patch(`/api/admin/branches/${empty.id}`, {
        data: { ...empty, active: true },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await admin.post("/api/admin/users", {
        data: {
          name: "DEMO blocked branch",
          email: email("archived"),
          password,
          role: "AGENT",
          active: true,
          branchId: empty.id,
        },
      })
    ).status(),
  ).toBe(400);
});
test("one-time invitations and reset tokens preserve MFA and revoke all sessions", async () => {
  const admin = contexts.admin;
  const issue = await admin.post("/api/identity/issue-token", {
    data: { password, userId: ids.invite, kind: "INVITE" },
  });
  expect(issue.status()).toBe(200);
  const issued = await issue.json();
  expect(issued.delivery).toBe("MANUAL_SECURE_CHANNEL");
  const saved = await db.accountToken.findFirstOrThrow({
    where: { userId: ids.invite },
  });
  expect(saved.id).not.toBe(issued.token);
  const publicCtx = await context();
  const next = randomBytes(24).toString("hex");
  expect(
    (
      await publicCtx.post("/api/identity/redeem", {
        data: { token: issued.token, password: next },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await publicCtx.post("/api/identity/redeem", {
        data: { token: issued.token, password: next },
      })
    ).status(),
  ).toBe(400);
  const activated = await auth("invite", "", next);
  expect(activated.response.status()).toBe(200);
  await activated.ctx.dispose();
  const reset = await admin.post("/api/identity/issue-token", {
    data: { password, userId: ids.reset, kind: "RESET" },
  });
  expect(reset.status()).toBe(200);
  const resetValue = await reset.json();
  const changed = randomBytes(24).toString("hex");
  const results = await Promise.all(
    [1, 2].map(() =>
      publicCtx.post("/api/identity/redeem", {
        data: { token: resetValue.token, password: changed },
      }),
    ),
  );
  expect(results.map((r) => r.status()).sort()).toEqual([200, 400]);
  expect((await contexts.reset.get("/api/admin/properties")).status()).toBe(
    401,
  );
  const invalid = await auth("reset");
  expect(invalid.response.status()).toBe(401);
  await invalid.ctx.dispose();
  const valid = await auth("reset", "", changed);
  expect(valid.response.status()).toBe(200);
  const security = await (await valid.ctx.get("/api/identity/security")).json();
  expect(security.sessions).toHaveLength(1);
  expect(
    (
      await admin.post("/api/identity/revoke-session", {
        data: { userId: ids.reset, id: "all" },
      })
    ).status(),
  ).toBe(200);
  expect((await valid.ctx.get("/api/identity/security")).status()).toBe(401);
  await valid.ctx.dispose();
  await publicCtx.dispose();
});
test("password change and expired or superseded account tokens fail closed", async () => {
  const admin = contexts.admin;
  const first = await admin.post("/api/identity/issue-token", {
    data: { password, userId: ids.change, kind: "RESET" },
  });
  expect(first.status()).toBe(200);
  const firstToken = (await first.json()).token;
  await db.accountToken.updateMany({
    where: { userId: ids.change },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  const publicCtx = await context();
  expect(
    (
      await publicCtx.post("/api/identity/redeem", {
        data: { token: firstToken, password },
      })
    ).status(),
  ).toBe(400);
  const second = await admin.post("/api/identity/issue-token", {
    data: { password, userId: ids.change, kind: "RESET" },
  });
  expect(second.status()).toBe(200);
  const secondToken = (await second.json()).token;
  expect(
    (
      await publicCtx.post("/api/identity/redeem", {
        data: { token: firstToken, password },
      })
    ).status(),
  ).toBe(400);
  const changed = randomBytes(24).toString("hex");
  expect(
    (
      await contexts.change.post("/api/identity/password", {
        data: { password: "incorrect-current", newPassword: changed },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await contexts.change.post("/api/identity/password", {
        data: { password, newPassword: changed },
      })
    ).status(),
  ).toBe(200);
  expect((await contexts.change.get("/api/identity/security")).status()).toBe(
    401,
  );
  expect(
    (
      await publicCtx.post("/api/identity/redeem", {
        data: { token: secondToken, password },
      })
    ).status(),
  ).toBe(400);
  const old = await auth("change");
  expect(old.response.status()).toBe(401);
  await old.ctx.dispose();
  const current = await auth("change", "", changed);
  expect(current.response.status()).toBe(200);
  await current.ctx.dispose();
  await publicCtx.dispose();
});

test("MFA enrollment encrypts secrets, invalidates sessions and rejects TOTP/recovery replay", async () => {
  const ctx = contexts.mfa;
  const setup = await ctx.post("/api/identity/mfa-setup", {
    data: { password },
  });
  expect(setup.status()).toBe(200);
  const value = await setup.json();
  const counter = Math.floor(Date.now() / 30000);
  const enabled = await ctx.post("/api/identity/mfa-enable", {
    data: { password, code: totp(value.secret, counter) },
  });
  expect(enabled.status()).toBe(200);
  const result = await enabled.json();
  expect(result.recoveryCodes).toHaveLength(8);
  const stored = await db.user.findUniqueOrThrow({ where: { id: ids.mfa } });
  expect(stored.mfaSecret).not.toContain(value.secret);
  expect(stored.recoveryHashes).not.toContain(result.recoveryCodes[0]);
  expect(stored.mfaPending).toBeNull();
  expect((await ctx.get("/api/identity/security")).status()).toBe(401);
  const missing = await auth("mfa");
  expect(missing.response.status()).toBe(401);
  expect((await missing.response.json()).code).toBe("MFA_REQUIRED");
  await missing.ctx.dispose();
  const current = await auth("mfa", totp(value.secret, counter));
  expect(current.response.status()).toBe(401);
  await current.ctx.dispose();
  const nextCode = totp(value.secret, Math.floor(Date.now() / 30000) + 1);
  const valid = await auth("mfa", nextCode);
  expect(valid.response.status()).toBe(200);
  const replay = await auth("mfa", nextCode);
  expect(replay.response.status()).toBe(401);
  await replay.ctx.dispose();
  const recovery = await Promise.all(
    [1, 2].map(() => auth("mfa", result.recoveryCodes[0])),
  );
  expect(recovery.map((r) => r.response.status()).sort()).toEqual([200, 401]);
  for (const r of recovery) await r.ctx.dispose();
  const reset = await contexts.admin.post("/api/identity/issue-token", {
    data: { password, userId: ids.mfa, kind: "RESET" },
  });
  const token = (await reset.json()).token;
  const publicCtx = await context();
  expect(
    (
      await publicCtx.post("/api/identity/redeem", {
        data: { token, password },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await publicCtx.post("/api/identity/redeem", {
        data: { token, password, code: result.recoveryCodes[1] },
      })
    ).status(),
  ).toBe(200);
  expect((await valid.ctx.get("/api/identity/security")).status()).toBe(401);
  const secured = await db.user.findUniqueOrThrow({ where: { id: ids.mfa } });
  expect(secured.mfaSecret).toBe(stored.mfaSecret);
  expect(await compare(password, secured.passwordHash)).toBe(true);
  await publicCtx.dispose();
  await valid.ctx.dispose();
});
test("mobile branch editor and security settings work at all required widths", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: base,
    storageState: await contexts.admin.storageState(),
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    for (const width of [320, 375, 390, 430, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/admin/branches");
      await expect(
        page.getByRole("heading", { name: "Pobočky", exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "+ Nový záznam" }).click();
      await expect(page.getByLabel("Názov pobočky")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.goto("/admin/security");
      await expect(
        page.getByRole("heading", { name: "Bezpečnosť účtu", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Aktívne relácie", exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page
      .getByRole("textbox", { name: "Meno", exact: true })
      .fill(`DEMO edited ${suffix}`);
    await page
      .getByRole("button", { name: "Uložiť profil", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Zmena bola uložená.");
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: ids.admin } })).name,
    ).toBe(`DEMO edited ${suffix}`);
    await page.goto("/admin/branches");
    await page.getByRole("button", { name: "+ Nový záznam" }).click();
    await page
      .getByLabel("Názov pobočky", { exact: true })
      .fill(`DEMO browser ${suffix}`);
    await page.getByLabel("Mesto", { exact: true }).fill("DEMO City");
    await page
      .getByRole("button", { name: "Uložiť zmeny", exact: true })
      .click();
    await expect(
      page.getByRole("row").filter({ hasText: `DEMO browser ${suffix}` }),
    ).toBeVisible();
    const saved = await db.branch.findFirstOrThrow({
      where: { name: `DEMO browser ${suffix}` },
    });
    branchIds.push(saved.id);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

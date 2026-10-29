import {
  test,
  expect,
  request,
  type APIRequestContext,
} from "@playwright/test";
import { randomUUID, randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { assertIsolatedTestProcess } from "../../src/config/test-environment";
import { db } from "../../src/lib/db";
assertIsolatedTestProcess();
const suffix = randomUUID().slice(0, 8);
const password = randomBytes(24).toString("hex");
const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
let admin: APIRequestContext;
let agent: APIRequestContext;
let manager: APIRequestContext;
let adminId: string;
let agentId: string;
let otherId: string;
let managerId: string;
let propertyId: string;
let ownedId: string;
let leadId: string;
let uploadUrl: string;
const property = (agentId: string, slug: string) => ({
  slug,
  translations: {
    sk: {
      title: "DEMO integration property",
      description: "This is an integration test, not a real listing.",
    },
    uk: {
      title: "DEMO інтеграційний об’єкт",
      description: "Демонстраційний об’єкт для інтеграційних тестів.",
    },
  },
  city: "Test City",
  region: "Test Region",
  address: "DEMO — no real address",
  type: "APARTMENT",
  transaction: "SALE",
  condition: "NEW",
  price: 200000,
  area: 80,
  rooms: 3,
  status: "DRAFT",
  demo: true,
  featured: false,
  images: ["/images/living.webp"],
  agentId,
});
async function login(email: string) {
  const c = await request.newContext({
    baseURL: base,
    extraHTTPHeaders: {
      Origin: base,
      "x-forwarded-for": `127.${parseInt(suffix.slice(0, 2), 16)}.${parseInt(suffix.slice(2, 4), 16)}.${parseInt(suffix.slice(4, 6), 16)}`,
    },
  });
  const r = await c.post("/api/auth/login", { data: { email, password } });
  expect(r.status()).toBe(200);
  return c;
}
test.beforeAll(async () => {
  const passwordHash = await hash(password, 12);
  adminId = (
    await db.user.create({
      data: {
        email: `test-admin-${suffix}@example.invalid`,
        name: "DEMO Test Admin",
        role: "ADMIN",
        passwordHash,
      },
    })
  ).id;
  agentId = (
    await db.user.create({
      data: {
        email: `test-agent-${suffix}@example.invalid`,
        name: "DEMO Test Agent",
        role: "AGENT",
        passwordHash,
      },
    })
  ).id;
  otherId = (
    await db.user.create({
      data: {
        email: `test-other-${suffix}@example.invalid`,
        name: "DEMO Test Other",
        role: "AGENT",
        passwordHash,
      },
    })
  ).id;
  managerId = (
    await db.user.create({
      data: {
        email: `test-manager-${suffix}@example.invalid`,
        name: "DEMO Test Manager",
        role: "MANAGER",
        passwordHash,
      },
    })
  ).id;
  admin = await login(`test-admin-${suffix}@example.invalid`);
  agent = await login(`test-agent-${suffix}@example.invalid`);
  manager = await login(`test-manager-${suffix}@example.invalid`);
});
test.afterAll(async () => {
  await db.lead.deleteMany({
    where: {
      OR: [
        {
          email: {
            in: [
              `test-lead-${suffix}@example.invalid`,
              `test-native-${suffix}@example.invalid`,
            ],
          },
        },
        { id: leadId ?? "none" },
      ],
    },
  });
  await db.property.deleteMany({ where: { slug: { endsWith: suffix } } });
  await db.content.deleteMany({ where: { slug: { endsWith: suffix } } });
  await db.auditLog.deleteMany({
    where: {
      actorId: { in: [adminId, agentId, otherId, managerId].filter(Boolean) },
    },
  });
  await db.user.deleteMany({
    where: {
      id: { in: [adminId, agentId, otherId, managerId].filter(Boolean) },
    },
  });
  await admin?.dispose();
  await agent?.dispose();
  await manager?.dispose();
  await db.$disconnect();
});
test("public data, localized canonical/hreflang, filters and 404", async ({
  request,
}) => {
  for (const path of [
    "/sk",
    "/uk",
    "/en",
    "/api/health",
    "/robots.txt",
    "/sitemap.xml",
  ])
    expect((await request.get(path)).status()).toBe(200);
  const r = await request.get(
    "/uk/nerukhomist?city=Bratislava&transaction=SALE",
  );
  const html = await r.text();
  expect(html).toContain('lang="uk"');
  expect(html).toContain('rel="canonical"');
  expect(html).toContain('hrefLang="sk"');
  expect(html).toContain("DEMO");
  expect((await request.get("/sk/not-a-page")).status()).toBe(404);
  expect(await (await request.get("/robots.txt")).text()).toContain(
    `${base}/sitemap.xml`,
  );
});
test("rejects anonymous access and cross-origin writes", async ({
  request,
}) => {
  expect((await request.get("/api/admin/properties")).status()).toBe(401);
  expect(
    (
      await request.post("/api/auth/login", {
        headers: { Origin: "https://evil.invalid" },
        data: { email: "a@example.invalid", password: "x" },
      })
    ).status(),
  ).toBe(403);
  expect((await request.post("/api/leads", { data: {} })).status()).toBe(403);
});
test("admin creates draft, edits and publishes; public sees only published", async ({
  request,
}) => {
  const v = property(otherId, `test-other-${suffix}`);
  const created = await admin.post("/api/admin/properties", { data: v });
  expect(created.status()).toBe(201);
  propertyId = (await created.json()).id;
  expect((await request.get(`/en/properties/${v.slug}`)).status()).toBe(404);
  const edited = await admin.patch(`/api/admin/properties/${propertyId}`, {
    data: { ...v, status: "PUBLISHED" },
  });
  expect(edited.status()).toBe(200);
  const published = await request.get(`/uk/nerukhomist/${v.slug}`);
  expect(published.status()).toBe(200);
  expect(await published.text()).toContain("DEMO інтеграційний об’єкт");
});
test("agent isolation, permitted edits and publication restrictions", async () => {
  expect(
    (
      await agent.patch(`/api/admin/properties/${propertyId}`, {
        data: property(agentId, `test-stolen-${suffix}`),
      })
    ).status(),
  ).toBe(403);
  const r = await agent.post("/api/admin/properties", {
    data: property(agentId, `test-owned-${suffix}`),
  });
  expect(r.status()).toBe(201);
  ownedId = (await r.json()).id;
  expect(
    (
      await agent.patch(`/api/admin/properties/${ownedId}`, {
        data: { ...property(agentId, `test-owned-${suffix}`), price: 220000 },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await agent.patch(`/api/admin/properties/${ownedId}`, {
        data: {
          ...property(agentId, `test-owned-${suffix}`),
          status: "PUBLISHED",
        },
      })
    ).status(),
  ).toBe(403);
  const list = await (await agent.get("/api/admin/properties")).json();
  expect(list.every((p: { agentId: string }) => p.agentId === agentId)).toBe(
    true,
  );
  expect((await agent.get("/api/admin/users")).status()).toBe(403);
  expect((await manager.get("/api/admin/settings")).status()).toBe(403);
});
test("lead consent, persistence, assignment and CRM status", async ({
  request,
}) => {
  const data = {
    name: "DEMO Lead",
    email: `test-lead-${suffix}@example.invalid`,
    message: "Please arrange a demonstration viewing.",
    kind: "VIEWING",
    locale: "en",
    consent: true,
    propertyId,
  };
  expect(
    (
      await request.post("/api/leads", {
        headers: { Origin: base },
        data: { ...data, consent: false },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/leads", {
        headers: { Origin: base },
        data: { ...data, website: "spam" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/leads", { headers: { Origin: base }, data })
    ).status(),
  ).toBe(201);
  const lead = await db.lead.findFirstOrThrow({ where: { email: data.email } });
  leadId = lead.id;
  expect(lead.agentId).toBe(otherId);
  expect(lead.consentAt).toBeTruthy();
  expect(
    (
      await agent.patch(`/api/admin/leads/${leadId}`, {
        data: { status: "CLOSED", notes: "Unauthorized" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await manager.patch(`/api/admin/leads/${leadId}`, {
        data: { status: "IN_PROGRESS", notes: "DEMO follow-up", agentId },
      })
    ).status(),
  ).toBe(200);
  const assigned = await (await agent.get("/api/admin/leads")).json();
  expect(assigned.some((v: { id: string }) => v.id === leadId)).toBe(true);
});
test("image validation, upload storage, delivery and audit", async () => {
  const invalid = await admin.post("/api/media", {
    multipart: {
      file: {
        name: "bad.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from("<svg><script>alert(1)</script></svg>"),
      },
    },
  });
  expect(invalid.status()).toBe(400);
  const fs = await import("node:fs/promises");
  const bytes = await fs.readFile("public/images/living.webp");
  const r = await admin.post("/api/media", {
    multipart: {
      file: { name: "test.webp", mimeType: "image/webp", buffer: bytes },
    },
  });
  expect(r.status()).toBe(201);
  uploadUrl = (await r.json()).url;
  const delivered = await admin.get(uploadUrl);
  expect(delivered.status()).toBe(200);
  expect(delivered.headers()["content-type"]).toContain("image/webp");
  const audit = await (await admin.get("/api/admin/audit")).json();
  expect(
    audit.some(
      (v: { action: string; actorId: string }) =>
        v.action === "UPLOAD" && v.actorId === adminId,
    ),
  ).toBe(true);
  await fs.unlink(
    `${process.env.UPLOAD_DIR ?? "data/uploads"}/${uploadUrl.split("/").pop()}`,
  );
});
test("manager manages content and can delete property; logout revokes session", async () => {
  const slug = `test-article-${suffix}`;
  const c = await manager.post("/api/admin/content", {
    data: {
      slug,
      kind: "BLOG",
      published: true,
      translations: {
        sk: {
          title: "DEMO article",
          description: "This article tests the publishing workflow.",
        },
      },
      seo: {},
    },
  });
  expect(c.status()).toBe(201);
  const contentId = (await c.json()).id;
  expect((await manager.get(`/en/journal/${slug}`)).status()).toBe(200);
  expect(
    (await manager.delete(`/api/admin/content/${contentId}`)).status(),
  ).toBe(200);
  expect(
    (await manager.delete(`/api/admin/properties/${ownedId}`)).status(),
  ).toBe(200);
  expect((await agent.post("/api/auth/logout")).status()).toBe(200);
  expect((await agent.get("/api/admin/properties")).status()).toBe(401);
});
test("desktop and mobile browsing, favorites and consent preferences", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/en");
  await expect(
    page.getByRole("heading", { name: "New address. New chapter." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Essential only" }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("domov-consent")!).analytics,
    ),
  ).toBe(false);
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.locator(".property-card .favorite").first().click();
  await page.goto("/en/favorites");
  await expect(page.locator(".property-card")).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/uk");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("staff editor creates and removes a draft through the browser", async ({
  page,
}) => {
  await page.goto("/admin");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill(`test-admin-${suffix}@example.invalid`);
  await page.getByLabel("Heslo", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Prihlásiť sa →" }).click();
  await expect(
    page.getByRole("heading", { name: "Prehľad", exact: true }),
  ).toBeVisible();
  await page.goto("/admin/properties");
  await page.getByRole("button", { name: "+ Nový záznam" }).click();
  await page.getByLabel("URL slug", { exact: true }).fill(`test-ui-${suffix}`);
  await page.getByLabel("Mesto", { exact: true }).fill("DEMO City");
  await page.getByLabel("Región", { exact: true }).fill("DEMO Region");
  await page
    .getByLabel("Nadpis", { exact: true })
    .first()
    .fill("DEMO browser property");
  await page
    .getByLabel("Popis (text, bez HTML)", { exact: true })
    .first()
    .fill("A demonstration property created through the actual staff form.");
  await expect(page.getByLabel("Zodpovedný agent")).toHaveValue(adminId);
  await page.getByRole("button", { name: "Uložiť zmeny" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Zmeny boli uložené." }),
  ).toBeVisible();
  const row = page
    .getByRole("row")
    .filter({ hasText: "DEMO browser property" });
  await expect(row).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "Odstrániť" }).click();
  await expect(row).toHaveCount(0);
});

test("gallery supports keyboard dismissal and maps stay opt-in", async ({
  page,
}) => {
  let externalMaps = 0;
  page.on("request", (r) => {
    if (r.url().includes("openstreetmap.org")) externalMaps++;
  });
  await page.goto("/en/properties/svetly-byt-bratislava");
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.locator(".gallery-main").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(externalMaps).toBe(0);
});

test("native form POST persists a lead with JavaScript disabled and keeps personal fields out of the URL", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: base,
  });
  try {
    const page = await context.newPage();
    await page.goto("/en/contact");
    await page.getByLabel("Name", { exact: true }).fill("DEMO Native");
    await page
      .getByLabel("Email", { exact: true })
      .fill(`test-native-${suffix}@example.invalid`);
    await page
      .getByLabel("Your message", { exact: true })
      .fill("A real native form submission without browser JavaScript.");
    await page.locator("input[name=consent]").check();
    await page.getByRole("button", { name: "Send request" }).click();
    await page.waitForURL(`${base}/en/contact?request=received`);
    expect(page.url()).not.toContain("email=");
    await expect(
      page.getByRole("status").filter({ hasText: "Thank you." }),
    ).toContainText("Thank you. We have received your request.");
    expect(
      await db.lead.count({
        where: { email: `test-native-${suffix}@example.invalid` },
      }),
    ).toBe(1);
  } finally {
    await context.close();
  }
});

test("public site and staff property editor fit all eight required viewport widths", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: base,
    storageState: await admin.storageState(),
  });
  try {
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const width of [320, 360, 375, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        "/en",
        "/en/properties",
        "/admin",
        "/admin/properties",
      ]) {
        await page.goto(route);
        await expect(page.locator("h1")).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          `${route} at ${width}px must not overflow`,
        ).toBe(true);
      }
      await page.getByRole("button", { name: "+ Nový záznam" }).click();
      await expect(page.getByLabel("URL slug", { exact: true })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `Editor at ${width}px must not overflow`,
      ).toBe(true);
      await page.getByRole("button", { name: "Zrušiť", exact: true }).click();
    }
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

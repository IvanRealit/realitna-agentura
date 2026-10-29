import { describe, it, expect } from "vitest";
import {
  testTarget,
  assertIsolatedTestProcess,
} from "../src/config/test-environment";
const safe = {
  TEST_DATABASE_URL:
    "postgresql://test:local-only@127.0.0.1:55432/realitna_test",
  DATABASE_URL: "postgresql://dev:other@localhost:5432/realitna",
};
describe("fail-closed test environment", () => {
  it("never falls back to the application database", () =>
    expect(() => testTarget({ DATABASE_URL: safe.DATABASE_URL })).toThrow(
      "TEST_DATABASE_URL is required",
    ));
  it.each([
    "postgresql://x:secret@db.example/realitna_test",
    "postgresql://x:secret@127.0.0.1/realitna",
    "postgresql://x:secret@127.0.0.1/postgres",
    "mysql://127.0.0.1/realitna_test",
    "invalid",
  ])("rejects unsafe database target %s", (url) =>
    expect(() => testTarget({ ...safe, TEST_DATABASE_URL: url })).toThrow(),
  );
  it("recognizes the same database behind loopback aliases and different credentials", () =>
    expect(() =>
      testTarget({
        DATABASE_URL:
          "postgresql://normal:private@localhost:55432/realitna_test?schema=public",
        TEST_DATABASE_URL: safe.TEST_DATABASE_URL,
      }),
    ).toThrow("must not target"));
  it.each([
    "https://production.example",
    "http://localhost:3000",
    "http://localhost",
    "http://localhost:3101/path",
    "http://user:pass@localhost:3101",
    "http://localhost:3101?token=x",
  ])("rejects unsafe browser origin %s", (origin) =>
    expect(() => testTarget({ ...safe, TEST_BASE_URL: origin })).toThrow(),
  );
  it("uses separate build, media, database and origin", () => {
    const t = testTarget(safe, "/workspace/example");
    expect(t).toMatchObject({
      databaseName: "realitna_test",
      baseUrl: "http://127.0.0.1:3101",
      port: 3101,
      distDir: ".next-test",
      mediaDirectory: "/workspace/example/data/test-uploads",
    });
  });
  it("rejects direct Playwright execution before fixtures mutate data", () =>
    expect(() => assertIsolatedTestProcess(safe)).toThrow(
      "direct test execution",
    ));
  it("requires matching server isolation markers and paths", () => {
    const t = testTarget(safe, "/workspace/example");
    const active = {
      ...safe,
      DATABASE_URL: safe.TEST_DATABASE_URL,
      APP_ENV: "test",
      TEST_ISOLATION_ID: "11111111-1111-4111-8111-111111111111",
      NEXT_DIST_DIR: ".next-test",
      SITE_URL: t.baseUrl,
      UPLOAD_DIR: t.mediaDirectory,
    };
    expect(assertIsolatedTestProcess(active, "/workspace/example")).toEqual(t);
    expect(() =>
      assertIsolatedTestProcess(
        { ...active, UPLOAD_DIR: "/private/live-data" },
        "/workspace/example",
      ),
    ).toThrow("must be isolated");
  });
});

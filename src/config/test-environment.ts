import path from "node:path";
export class TestEnvironmentError extends Error {}
type Env = Record<string, string | undefined>;
function localHost(host: string) {
  return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(host);
}
function databaseIdentity(value: string) {
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new TestEnvironmentError(
      "Invalid database URL; values are intentionally not logged.",
    );
  }
  if (!["postgres:", "postgresql:"].includes(u.protocol))
    throw new TestEnvironmentError("Tests require PostgreSQL.");
  return {
    host: localHost(u.hostname) ? "loopback" : u.hostname,
    port: u.port || "5432",
    name: decodeURIComponent(u.pathname.slice(1)),
    url: u,
  };
}
export function testTarget(env: Env, root = process.cwd()) {
  if (!env.TEST_DATABASE_URL)
    throw new TestEnvironmentError(
      "TEST_DATABASE_URL is required. The development DATABASE_URL is never a fallback.",
    );
  const target = databaseIdentity(env.TEST_DATABASE_URL);
  if (
    target.host !== "loopback" ||
    !/^realitna[a-zA-Z0-9_]*_test$/.test(target.name)
  )
    throw new TestEnvironmentError(
      "Use a dedicated loopback PostgreSQL database named realitna*_test. Remote/production databases are forbidden.",
    );
  if (env.DATABASE_URL) {
    const normal = databaseIdentity(env.DATABASE_URL);
    if (
      normal.host === target.host &&
      normal.port === target.port &&
      normal.name === target.name
    )
      throw new TestEnvironmentError(
        "TEST_DATABASE_URL must not target the development/application database, even with different credentials or query parameters.",
      );
  }
  let base: URL;
  try {
    base = new URL(env.TEST_BASE_URL ?? "http://127.0.0.1:3101");
  } catch {
    throw new TestEnvironmentError("Invalid local test origin.");
  }
  const port = Number(base.port);
  if (
    base.protocol !== "http:" ||
    !localHost(base.hostname) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== "/" ||
    !Number.isInteger(port) ||
    port < 1024 ||
    port > 65535 ||
    port === 3000
  )
    throw new TestEnvironmentError(
      "TEST_BASE_URL must be a separate loopback HTTP origin with an explicit unprivileged port other than 3000.",
    );
  // A single canonical hostname keeps browser Origin checks and server binding consistent.
  base.hostname = "127.0.0.1";
  return {
    databaseUrl: env.TEST_DATABASE_URL,
    databaseName: target.name,
    baseUrl: base.origin,
    port,
    distDir: ".next-test",
    mediaDirectory: path.resolve(root, "data/test-uploads"),
  };
}
export function assertIsolatedTestProcess(
  env: Env = process.env,
  root = process.cwd(),
) {
  if (
    env.APP_ENV !== "test" ||
    !env.TEST_ISOLATION_ID ||
    !/^[a-f0-9-]{36}$/.test(env.TEST_ISOLATION_ID) ||
    env.DATABASE_URL !== env.TEST_DATABASE_URL
  )
    throw new TestEnvironmentError(
      "Use npm run test:prepare and npm run test:e2e; direct test execution without isolation is forbidden.",
    );
  const target = testTarget({ ...env, DATABASE_URL: undefined }, root);
  if (
    env.NEXT_DIST_DIR !== target.distDir ||
    env.SITE_URL !== target.baseUrl ||
    path.resolve(env.UPLOAD_DIR ?? "") !== target.mediaDirectory
  )
    throw new TestEnvironmentError(
      "Test build, origin and media directories must be isolated.",
    );
  return target;
}

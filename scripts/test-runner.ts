import "dotenv/config";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { lstat, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  testTarget,
  TestEnvironmentError,
} from "../src/config/test-environment";
async function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env });
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) process.exit(exitCode);
}
try {
  const target = testTarget(process.env);
  for (const relative of ["data", "data/test-uploads", ".next-test"]) {
    try {
      if ((await lstat(path.resolve(relative))).isSymbolicLink())
        throw new TestEnvironmentError(
          "Test data/build paths must not be symlinks.",
        );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: target.databaseUrl,
    TEST_DATABASE_URL: target.databaseUrl,
    TEST_BASE_URL: target.baseUrl,
    SITE_URL: target.baseUrl,
    APP_ENV: "test",
    TEST_ISOLATION_ID: randomUUID(),
    NEXT_DIST_DIR: target.distDir,
    UPLOAD_DIR: target.mediaDirectory,
    COOKIE_SECURE: "false",
    TRUST_PROXY: "true",
    NEXT_TELEMETRY_DISABLED: "1",
  };
  delete env.SEED_ADMIN_EMAIL;
  delete env.SEED_ADMIN_PASSWORD;
  await mkdir(target.mediaDirectory, { recursive: true });
  const action = process.argv[2];
  if (action === "prepare") {
    console.log(
      "Preparing isolated test database, media and production-mode test build.",
    );
    await run(process.execPath, ["--import", "tsx", "scripts/migrate.ts"], env);
    await run(process.execPath, ["--import", "tsx", "prisma/seed.ts"], env);
    // A different build origin catches accidentally static canonical/robots metadata.
    await run("npm", ["run", "build"], {
      ...env,
      SITE_URL: "http://build-only.invalid",
    });
  } else if (action === "e2e") {
    await run(
      process.execPath,
      [
        "node_modules/@playwright/test/cli.js",
        "test",
        ...process.argv.slice(3),
      ],
      env,
    );
  } else throw new TestEnvironmentError("Expected prepare or e2e.");
} catch (e) {
  console.error(
    e instanceof TestEnvironmentError
      ? e.message
      : "Isolated test runner failed; inspect the command status without exposing credentials.",
  );
  process.exitCode = 1;
}

import { randomInt } from "node:crypto";
import "dotenv/config";
import { defineConfig } from "@playwright/test";
import { assertIsolatedTestProcess } from "./src/config/test-environment";
const target = assertIsolatedTestProcess();
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/support/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: target.baseUrl,
    trace: "retain-on-failure",
    extraHTTPHeaders: {
      "x-forwarded-for": `127.${randomInt(1, 254)}.${randomInt(1, 254)}.${randomInt(1, 254)}`,
    },
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: {
    command: `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${target.port}`,
    url: `${target.baseUrl}/api/health`,
    timeout: 60000,
    reuseExistingServer: false,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});

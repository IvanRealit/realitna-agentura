import { randomInt } from "node:crypto";
import "dotenv/config";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: process.env.TEST_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    extraHTTPHeaders: {
      "x-forwarded-for": `127.${randomInt(1, 254)}.${randomInt(1, 254)}.${randomInt(1, 254)}`,
    },
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer:
    process.env.PLAYWRIGHT_START_SERVER === "true"
      ? {
          command: "npm start",
          // The private test runner acts as trusted ingress, using unique test IPs
          // so repeated suites do not share the real development login bucket.
          env: { TRUST_PROXY: "true" },
          url: process.env.TEST_BASE_URL ?? "http://localhost:3000",
          timeout: 60000,
          reuseExistingServer: false,
        }
      : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
});

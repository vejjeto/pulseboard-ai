import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:3004",
    trace: "on-first-retry",
    launchOptions: {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    },
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3004/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

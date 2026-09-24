import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // Locally the suite reuses `npm run dev`, which compiles each route on its
  // first request; parallel workers hitting uncompiled routes at once starve
  // it until page.goto times out (6/9 failed at the default worker count,
  // 9/9 pass with one). CI keeps Playwright's default.
  workers: process.env.CI ? undefined : 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], launchOptions: { args: ["--no-sandbox"] } },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

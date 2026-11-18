import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:4173", channel: process.env.PLAYWRIGHT_CHANNEL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: { command: "npm run preview", url: "http://127.0.0.1:4173", reuseExistingServer: !process.env.CI, timeout: 30_000 },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1100 } } },
    { name: "movil", use: { ...devices["Pixel 7"] } },
  ],
});

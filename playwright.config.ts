import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  use: { baseURL: process.env.APP_BASE_URL ?? "http://localhost:3000", locale: "ka-GE" },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
    env: { AI_MOCK: "true", AUTH_DEV_LOGIN: "true", AUTH_SECRET: "e2e-secret-not-for-prod" },
  },
});

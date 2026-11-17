import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Browser tests against a production build (`npm run build` first).
 * They need no real services: Clerk and Supabase get harmless placeholders and
 * signals are mocked, so only signed-out pages, the auth guard and the public
 * dev shell are exercised. Set E2E_BASE_URL to point at an already running app.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run start -- --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_Y2xlcmsuZXhhbXBsZS5jb20k",
          CLERK_SECRET_KEY: "sk_live_placeholder",
          NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "placeholder-anon-key",
          SUPABASE_SERVICE_ROLE_KEY: "placeholder-service-role-key",
          MOCK_SIGNALS: "true",
          CACHE_DISABLED: "true",
          NEXT_TELEMETRY_DISABLED: "1",
        },
      },
});

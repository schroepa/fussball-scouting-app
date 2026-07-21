import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  // @astrojs/vercel does not support `astro preview`; use the dev server for
  // local/CI smoke (SSR pages need a live Astro server).
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4321",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      PUBLIC_SUPABASE_URL: "",
      PUBLIC_SUPABASE_ANON_KEY: "",
    },
  },
});

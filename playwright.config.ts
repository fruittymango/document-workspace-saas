import { defineConfig, devices } from "@playwright/test";

// [Confirm E2E_BASE_URL matches wherever your app actually runs — the
//  Next.js dev server default, or a docker-compose port, etc.]
const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // sequential: several tests share seeded demo accounts
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Uncomment for cross-browser coverage once the core suite is stable:
    // { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],

  // Optional: let `npx playwright test` boot the app itself rather than
  // requiring it to already be running. Comment out if you'd rather start
  // the app manually / via docker-compose before running tests.
  webServer: {
    command: "npm run dev --prefix backend",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

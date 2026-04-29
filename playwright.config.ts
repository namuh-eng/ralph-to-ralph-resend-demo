import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://localhost:3016",
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "bun run dev",
    port: 3016,
    reuseExistingServer: true,
  },
});

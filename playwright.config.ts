import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  use: { baseURL: "http://localhost:3010", viewport: { width: 1440, height: 1100 } },
  webServer: { command: "npm run dev", url: "http://localhost:3010", reuseExistingServer: !process.env.CI },
});

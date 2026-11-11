import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:3000", channel: "msedge" },
  webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER ? undefined : {
    command: "node node_modules/next/dist/bin/next start --hostname localhost",
    url: "http://localhost:3000",
    reuseExistingServer: false,
  },
});

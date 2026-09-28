import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: process.env.DISCUSSIONS_REF_TEST_URL ?? "http://localhost:5195",
  },
  webServer: process.env.DISCUSSIONS_REF_TEST_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:5195/articles",
        reuseExistingServer: false,
        timeout: 180_000,
      },
});

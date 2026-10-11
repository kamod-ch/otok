import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BENCH_URL;
if (!baseURL) {
  throw new Error("BENCH_URL must point at an already running production playground server");
}

export default defineConfig({
  testDir: ".",
  testMatch: "navigation.spec.ts",
  timeout: 120_000,
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
  },
});

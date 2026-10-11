import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  use: {
    baseURL: process.env.WORKFLOW_OPS_TEST_URL ?? "http://127.0.0.1:5190",
  },
  webServer: {
    command: "pnpm exec tsx src/server.ts",
    url: "http://127.0.0.1:5190/login",
    reuseExistingServer: !process.env.CI,
    env: {
      WORKFLOW_OPS_PORT: "5190",
      WORKFLOW_OPS_SESSION_SECRET: "e2e-test-secret-32-chars-minimum!!",
      WORKFLOW_OPS_OPERATOR_PASSWORD: "e2e-operator-password",
      NODE_ENV: "test",
    },
  },
});

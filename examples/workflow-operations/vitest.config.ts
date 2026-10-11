import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    typecheck: {
      tsconfig: "./tsconfig.tests.json",
    },
  },
});

import { definePreset } from "@otok/config";

export default definePreset({
  name: "@otok/preset-crm",
  extends: ["@otok/preset-minimal"],
  starter: "minimal",
  otok: "^0.4.0",
  packageJson: {
    dependencies: {
      "@otok/kit-crm": "workspace:*",
    },
  },
});

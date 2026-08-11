import { definePreset } from "@kamod-ch/otok-config";

export default definePreset({
  name: "@kamod-ch/otok-preset-crm",
  extends: ["@kamod-ch/otok-preset-minimal"],
  starter: "minimal",
  otok: "^0.4.0",
  packageJson: {
    dependencies: {
      "@kamod-ch/otok-kit-crm": "workspace:*",
    },
  },
});

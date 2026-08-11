import { defineKit } from "@kamod-ch/otok-config";

export default defineKit({
  kind: "kit",
  name: "@kamod-ch/otok-kit-content",
  version: "0.1.0",
  starter: "minimal",
  recommends: ["@kamod-ch/otok-content"],
  routes: [{ from: "kit-files/routes/content/index.tsx", to: "src/app/routes/content/index.tsx" }],
  packageJson: { dependencies: { "@kamod-ch/otok-content": ">=0.1.0" } },
});

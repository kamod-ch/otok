import { defineConfig } from "@kamod-ch/otok";
import cloudflare from "otok-adapter-cloudflare";

export default defineConfig({
  adapter: cloudflare({ outDir: "dist", wranglerName: "otok-adapter-example-cloudflare" }),
});

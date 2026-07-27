import { defineConfig } from "otok";
import cloudflare from "otok-adapter-cloudflare";

export default defineConfig({
  adapter: cloudflare({ outDir: "dist", wranglerName: "otok-adapter-example-cloudflare" }),
});

import { defineConfig } from "otok";
import node from "otok-adapter-node";

export default defineConfig({
  adapter: node({ outDir: "dist", port: 3000, host: "0.0.0.0" }),
});

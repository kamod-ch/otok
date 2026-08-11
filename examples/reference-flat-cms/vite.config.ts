import preact from "@preact/preset-vite";
import devServer from "@hono/vite-dev-server";
import { otok } from "@kamod-ch/otok-vite-plugin";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [preact(), otok(), devServer({ entry: "src/server.ts" })],
  build: {
    ssr: mode !== "client" ? "src/server.ts" : false,
    outDir: mode === "client" ? "dist/client" : "dist/server",
    manifest: mode === "client",
    rollupOptions: mode === "client" ? { input: "src/client.ts" } : undefined,
  },
}));

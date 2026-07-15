import preact from "@preact/preset-vite";
import { otok } from "@otok/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [preact(), otok()],
  build: {
    ssr: mode !== "client" ? "src/server.ts" : false,
    outDir: mode === "client" ? "dist/client" : "dist/server",
    manifest: mode === "client",
    rollupOptions: mode === "client" ? { input: "src/client.ts" } : undefined,
  },
}));

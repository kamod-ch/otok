import preact from "@preact/preset-vite";
import { otok } from "@otok/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [preact(), otok()],
  build: {
    ssr: mode !== "client" ? "src/server.ts" : false,
    outDir: mode === "client" ? "dist/client" : "dist/server",
    emptyOutDir: true,
    manifest: mode === "client",
    target: mode === "client" ? undefined : "es2022",
    rollupOptions:
      mode === "client"
        ? { input: "src/client.ts" }
        : {
            output: {
              entryFileNames: "server.js",
              format: "es",
            },
          },
  },
  ssr: {
    target: "webworker",
    // Bundle framework deps into the worker so Wrangler does not need Node resolution.
    noExternal: true,
  },
}));

import devServer from "@hono/vite-dev-server";
import preact from "@preact/preset-vite";
import otok from "@kamod-ch/otok-vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [otok(), preact(), tailwindcss(), devServer({ entry: "src/otok.generated.server.ts" })],
  server: { port: 5180 },
  ssr: {
    external: ["@node-rs/argon2", "@node-rs/argon2-linux-x64-gnu", "@node-rs/argon2-linux-x64-musl"],
  },
  build: {
    ssr: mode !== "client" ? "src/otok.generated.server.ts" : false,
    outDir: mode === "client" ? "dist/client" : "dist/server",
    manifest: mode === "client",
    rollupOptions: mode === "client" ? { input: "src/client.ts" } : undefined,
  },
}));

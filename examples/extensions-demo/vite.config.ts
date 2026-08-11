import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import devServer from "@hono/vite-dev-server";
import otok from "@kamod-ch/otok-vite-plugin";

export default defineConfig({
  plugins: [
    otok(),
    preact(),
    devServer({
      entry: "src/server.ts",
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        client: "src/client.ts",
      },
    },
  },
});

import { defineConfig } from "vite";
import devServer from "@hono/vite-dev-server";
import otok from "@kamod-ch/otok-vite-plugin";

export default defineConfig({
  plugins: [
    otok(),
    devServer({
      entry: "src/server.ts",
    }),
  ],
});

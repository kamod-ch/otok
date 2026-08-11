import devServer from "@hono/vite-dev-server";
import preact from "@preact/preset-vite";
import otok from "@kamod-ch/otok-vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [otok(), preact(), tailwindcss(), devServer({ entry: "src/otok.generated.server.ts" })],
  server: { port: 5173 },
});

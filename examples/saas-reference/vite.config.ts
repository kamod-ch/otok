import preact from "@preact/preset-vite";
import otok from "@otok/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [otok(), preact(), tailwindcss()],
  server: { port: 5173 },
});

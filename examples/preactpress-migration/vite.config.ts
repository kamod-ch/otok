import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import otok from "@kamod-ch/otok-vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [otok(), preact(), tailwindcss()],
});

import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import otok from "@kamod-ch/otok-vite-plugin";

export default defineConfig({
  plugins: [preact(), otok()],
});

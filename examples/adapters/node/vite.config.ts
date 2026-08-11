import preact from "@preact/preset-vite";
import otok from "@kamod-ch/otok-vite-plugin";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const plugins = [otok(), preact()];

  if (mode === "client") {
    return { plugins };
  }

  return { plugins };
});

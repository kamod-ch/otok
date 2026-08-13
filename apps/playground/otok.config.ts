import { defineConfig } from "@kamod-ch/otok";
import hello from "@kamod-ch/otok-plugin-hello";

export default defineConfig({
  plugins: [hello()],
});

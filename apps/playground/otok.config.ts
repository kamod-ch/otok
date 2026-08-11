import { defineConfig } from "otok";
import hello from "@kamod-ch/otok-plugin-hello";

export default defineConfig({
  plugins: [hello()],
});

import { defineConfig } from "otok";
import hello from "@otok/plugin-hello";

export default defineConfig({
  plugins: [hello()],
});

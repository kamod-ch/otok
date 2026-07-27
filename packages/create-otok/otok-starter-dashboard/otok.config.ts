import { defineConfig } from "otok";
import kamod from "@kamod-ch/otok-kamod";

export default defineConfig({
  plugins: [
    kamod({
      theme: "default",
      icons: true,
      forms: true,
    }),
  ],
});

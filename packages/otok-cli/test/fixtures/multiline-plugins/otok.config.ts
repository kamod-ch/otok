import { defineConfig } from "@kamod-ch/otok";
import hello from "@kamod-ch/otok-plugin-hello";
import oauth from "@kamod-ch/otok-oauth";

export default defineConfig({
  plugins: [
    hello(),
    oauth(),
  ],
});

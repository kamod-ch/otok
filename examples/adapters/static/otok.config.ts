import { defineConfig } from "@kamod-ch/otok";
import staticAdapter from "otok-adapter-static";

export default defineConfig({
  adapter: staticAdapter({ outDir: "dist", strict: true }),
});

import { defineConfig } from "otok";
import staticAdapter from "otok-adapter-static";

export default defineConfig({
  adapter: staticAdapter({ outDir: "dist", strict: true }),
});

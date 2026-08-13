import { defineConfig } from "@kamod-ch/otok";
import devtools from "@kamod-ch/otok-devtools";

export default defineConfig({
  plugins: [devtools()],
});

import { defineConfig } from "otok";
import node from "otok-adapter-node";
import forum from "@otok/forum/plugin";
import { forumStorage } from "./src/lib/db.js";
import { createDemoAuthAdapter } from "./src/lib/auth.js";

export default defineConfig({
  adapter: node({ outDir: "dist", port: 3456 }),
  plugins: [
    forum({
      basePath: "/community",
      storage: forumStorage,
      auth: createDemoAuthAdapter(),
      locale: "de",
      seo: { siteName: "Otok Forum Demo", origin: "http://localhost:3456" },
    }),
  ],
});

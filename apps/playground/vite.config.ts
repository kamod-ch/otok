import devServer from "@hono/vite-dev-server";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import otok from "@otok/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const plugins = [otok(), preact(), tailwindcss()];

  if (mode === "client") {
    return {
      plugins,
      build: {
        outDir: "dist/client",
        manifest: true,
        emptyOutDir: true,
        rollupOptions: {
          input: "src/client.ts",
          output: {
            entryFileNames: "assets/[name]-[hash].js",
            chunkFileNames: "assets/[name]-[hash].js",
            assetFileNames: "assets/[name]-[hash][extname]",
          },
        },
      },
    };
  }

  return {
    plugins: [
      ...plugins,
      devServer({
        entry: "src/server.ts",
      }),
    ],
    build: {
      outDir: "dist/server",
      ssr: "src/server.ts",
      emptyOutDir: true,
      rollupOptions: {
        output: {
          entryFileNames: "[name].js",
        },
      },
    },
  };
});

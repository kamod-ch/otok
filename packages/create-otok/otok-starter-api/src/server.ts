import { serve } from "@hono/node-server";
import { createOtokApp, json, readOtokManifest } from "@kamod-ch/otok/server";
import { errorRoute, notFoundRoute, routes } from "virtual:otok-routes";

const items = [{ id: "1", name: "Sample item" }];

const app = createOtokApp({
  routes,
  notFoundRoute,
  errorRoute,
  manifest: readOtokManifest(import.meta.url),
  clientEntry: "src/client.ts",
  devClientEntry: "/src/client.ts",
  staticDir: "./dist/client",
  health: { ok: true, framework: "otok" },
  configure: (hono) => {
    hono.get("/api/health", (c) => c.json({ ok: true }));
    hono.get("/api/items", (c) => c.json({ items }));
    hono.post("/api/items", async (c) => {
      const body = await c.req.json<{ name?: string }>();
      const item = { id: String(items.length + 1), name: body.name ?? "Untitled" };
      items.push(item);
      return json({ item }, 201);
    });
  },
});

export default app;

if (import.meta.env.PROD) {
  serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3000) });
}

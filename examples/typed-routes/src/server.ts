import { createOtokApp } from "@kamod-ch/otok/server";
import { serve } from "@hono/node-server";
import { routes, notFoundRoute, errorRoute } from "virtual:otok-routes";

const app = createOtokApp({ routes, notFoundRoute, errorRoute });

serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3000) });

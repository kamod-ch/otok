import { createOtokHandler } from "otok/server";
import { serve } from "@hono/node-server";
import { routes, notFoundRoute, errorRoute } from "virtual:otok-routes";

const handler = createOtokHandler({ routes, notFoundRoute, errorRoute });

serve({ fetch: handler.fetch, port: Number(process.env.PORT ?? 3000) });

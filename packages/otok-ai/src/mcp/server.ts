import type { Hono } from "hono";
import { OtokAiMcpPermissionError } from "../errors.js";

export interface McpServerOptions {
  path: string;
  allowedRoutes: readonly string[];
  fetchImpl: (path: string, init?: RequestInit) => Promise<Response>;
}

interface McpToolDescriptor {
  name: string;
  description: string;
  route: string;
  method: string;
}

function routeToToolName(route: string): string {
  return route.replace(/^\//, "").replace(/\//g, "_").replace(/\[|\]/g, "") || "root";
}

export function mountMcpRoutes(app: Hono, options: McpServerOptions): void {
  const tools: McpToolDescriptor[] = options.allowedRoutes.map((route) => ({
    name: routeToToolName(route),
    description: `Proxy to Otok route ${route}`,
    route,
    method: "GET",
  }));

  app.get(options.path, (c) => {
    return c.json({
      protocol: "otok-mcp/1",
      tools,
      note: "Only explicitly allowlisted routes are exposed.",
    });
  });

  app.post(`${options.path}/call`, async (c) => {
    const body = (await c.req.json()) as { name?: string; arguments?: Record<string, unknown> };
    const tool = tools.find((t) => t.name === body.name);
    if (!tool) {
      return c.json({ error: { code: "unknown_tool", message: "Tool not found" } }, 404);
    }
    if (!options.allowedRoutes.includes(tool.route)) {
      throw new OtokAiMcpPermissionError(`Route ${tool.route} is not allowlisted for MCP`);
    }

    const url = new URL(tool.route, "http://localhost");
    if (body.arguments) {
      for (const [key, value] of Object.entries(body.arguments)) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await options.fetchImpl(url.pathname + url.search, { method: tool.method });
    const contentType = response.headers.get("content-type") ?? "";
    const result = contentType.includes("application/json") ? await response.json() : await response.text();
    return c.json({ result, status: response.status });
  });
}

export function isRouteMcpAllowed(route: string, allowed: readonly string[]): boolean {
  return allowed.includes(route);
}

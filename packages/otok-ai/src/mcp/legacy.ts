import type { Hono } from "hono";
import { OtokAiMcpPermissionError, OtokAiValidationError } from "../errors.js";
import {
  assertToolAllowed,
  buildMcpToolDescriptors,
  forwardMcpRequestHeaders,
  invokeAllowlistedRoute,
  type McpToolDescriptor,
} from "./routes.js";

export interface LegacyMcpServerOptions {
  path: string;
  allowedRoutes: readonly string[];
  fetchImpl: (path: string, init?: RequestInit) => Promise<Response>;
}

export function mountLegacyOtokMcpRoutes(app: Hono, options: LegacyMcpServerOptions): void {
  const tools: McpToolDescriptor[] = buildMcpToolDescriptors(options.allowedRoutes);

  app.get(options.path, (c) => {
    return c.json({
      protocol: "otok-mcp/1",
      tools,
      note: "Only explicitly allowlisted routes are exposed. Use mcpStreamablePath for standard MCP Streamable HTTP.",
    });
  });

  app.post(`${options.path}/call`, async (c) => {
    try {
      const body = (await c.req.json()) as { name?: string; arguments?: Record<string, unknown> };
      const tool = tools.find((t) => t.name === body.name);
      if (!tool) {
        return c.json({ error: { code: "unknown_tool", message: "Tool not found" } }, 404);
      }
      assertToolAllowed(tool, options.allowedRoutes);

      const headers = forwardMcpRequestHeaders(
        Object.fromEntries(c.req.raw.headers.entries()) as Record<string, string>,
      );
      const payload = await invokeAllowlistedRoute(tool, options.allowedRoutes, body.arguments, options.fetchImpl, {
        headers,
      });
      return c.json(payload);
    } catch (error) {
      if (error instanceof OtokAiMcpPermissionError) {
        return c.json({ error: { code: "permission_denied", message: error.message } }, 403);
      }
      if (error instanceof OtokAiValidationError) {
        return c.json({ error: { code: "validation_error", message: error.message } }, 400);
      }
      throw error;
    }
  });
}

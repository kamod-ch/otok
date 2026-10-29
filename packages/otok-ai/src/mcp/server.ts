import type { Hono } from "hono";
import { OtokAiConfigError } from "../errors.js";
import { mountLegacyOtokMcpRoutes } from "./legacy.js";

export interface McpServerOptions {
  path: string;
  /** Standard MCP Streamable HTTP endpoint (separate from legacy otok-mcp/1). */
  streamablePath?: string;
  allowedRoutes: readonly string[];
  fetchImpl: (path: string, init?: RequestInit) => Promise<Response>;
}

export { isRouteMcpAllowed } from "./routes.js";
export { mountLegacyOtokMcpRoutes } from "./legacy.js";
export type { StreamableMcpServerOptions } from "./streamable.js";

/**
 * Mount legacy otok-mcp/1 routes always. Streamable HTTP is loaded only when `streamablePath` is set
 * (peer deps `@hono/mcp`, `@modelcontextprotocol/sdk`).
 */
export async function mountMcpRoutes(app: Hono, options: McpServerOptions): Promise<void> {
  mountLegacyOtokMcpRoutes(app, options);
  if (!options.streamablePath) return;

  try {
    const { mountStreamableMcpRoutes } = await import("./streamable.js");
    mountStreamableMcpRoutes(app, {
      path: options.streamablePath,
      allowedRoutes: options.allowedRoutes,
      fetchImpl: options.fetchImpl,
    });
  } catch (error) {
    throw new OtokAiConfigError(
      "Streamable MCP requires peer dependencies @hono/mcp (>=0.3.4) and @modelcontextprotocol/sdk (>=1.29). Install them or set mcpStreamablePath: false.",
      { cause: error },
    );
  }
}

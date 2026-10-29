import type { Hono } from "hono";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPTransport } from "@hono/mcp";
import { z } from "zod";
import { OtokAiMcpPermissionError, OtokAiValidationError } from "../errors.js";
import { buildMcpToolDescriptors, forwardMcpRequestHeaders, invokeAllowlistedRoute } from "./routes.js";

export interface StreamableMcpServerOptions {
  path: string;
  allowedRoutes: readonly string[];
  fetchImpl: (path: string, init?: RequestInit) => Promise<Response>;
  /** Use JSON responses instead of SSE for simpler clients and tests. Default true. */
  enableJsonResponse?: boolean;
}

const toolArgumentsSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .optional()
  .describe("Query parameters forwarded to the allowlisted Otok route");

export function createStreamableMcpServer(options: StreamableMcpServerOptions): {
  mcpServer: McpServer;
  transport: StreamableHTTPTransport;
} {
  const mcpServer = new McpServer({ name: "otok-ai", version: "1.0.0" });
  const tools = buildMcpToolDescriptors(options.allowedRoutes);

  for (const tool of tools) {
    mcpServer.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: toolArgumentsSchema,
      },
      async (args, extra) => {
        try {
          const headers = forwardMcpRequestHeaders(
            extra.requestInfo?.headers as Record<string, string | string[] | undefined> | undefined,
          );
          const payload = await invokeAllowlistedRoute(
            tool,
            options.allowedRoutes,
            args as Record<string, unknown> | undefined,
            options.fetchImpl,
            { headers },
          );
          return {
            isError: payload.status >= 400,
            content: [{ type: "text", text: JSON.stringify(payload) }],
          };
        } catch (error) {
          const message =
            error instanceof OtokAiMcpPermissionError || error instanceof OtokAiValidationError
              ? error.message
              : error instanceof Error
                ? error.message
                : "Tool execution failed";
          return {
            isError: true,
            content: [{ type: "text", text: message }],
          };
        }
      },
    );
  }

  const transport = new StreamableHTTPTransport({
    enableJsonResponse: options.enableJsonResponse ?? true,
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  return { mcpServer, transport };
}

export function mountStreamableMcpRoutes(app: Hono, options: StreamableMcpServerOptions): void {
  const { mcpServer, transport } = createStreamableMcpServer(options);

  app.all(options.path, async (c) => {
    if (!mcpServer.isConnected()) {
      await mcpServer.connect(transport);
    }
    return transport.handleRequest(c);
  });
}

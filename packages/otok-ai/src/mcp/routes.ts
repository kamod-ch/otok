import { OtokAiMcpPermissionError, OtokAiValidationError } from "../errors.js";

export interface McpToolDescriptor {
  name: string;
  description: string;
  route: string;
  method: "GET";
}

const RESERVED_ARGUMENT_KEYS = new Set(["path", "route", "method", "url", "__proto__", "prototype", "constructor"]);

export function routeToToolName(route: string): string {
  return route.replace(/^\//, "").replace(/\//g, "_").replace(/\[|\]/g, "") || "root";
}

export function buildMcpToolDescriptors(allowedRoutes: readonly string[]): McpToolDescriptor[] {
  return allowedRoutes.map((route) => ({
    name: routeToToolName(route),
    description: `Proxy to Otok route ${route}`,
    route,
    method: "GET",
  }));
}

export function isRouteMcpAllowed(route: string, allowed: readonly string[]): boolean {
  return allowed.includes(route);
}

export function parseMcpToolArguments(args: Record<string, unknown> | undefined): Record<string, string> {
  if (!args) return {};
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(args)) {
    const normalized = key.toLowerCase();
    if (RESERVED_ARGUMENT_KEYS.has(normalized)) {
      throw new OtokAiValidationError(`MCP argument "${key}" is reserved`);
    }
    if (value === null || value === undefined) continue;
    if (typeof value === "object") {
      throw new OtokAiValidationError(`MCP argument "${key}" must be a scalar value`);
    }
    output[key] = String(value);
  }
  return output;
}

export function assertToolAllowed(
  tool: McpToolDescriptor | undefined,
  allowedRoutes: readonly string[],
): asserts tool is McpToolDescriptor {
  if (!tool) {
    throw new OtokAiMcpPermissionError("Tool not found or not allowlisted");
  }
  if (!isRouteMcpAllowed(tool.route, allowedRoutes)) {
    throw new OtokAiMcpPermissionError(`Route ${tool.route} is not allowlisted for MCP`);
  }
}

export async function invokeAllowlistedRoute(
  tool: McpToolDescriptor,
  allowedRoutes: readonly string[],
  args: Record<string, unknown> | undefined,
  fetchImpl: (path: string, init?: RequestInit) => Promise<Response>,
  init?: RequestInit,
): Promise<{ status: number; result: unknown }> {
  assertToolAllowed(tool, allowedRoutes);
  if (init?.method && init.method !== "GET" && init.method !== tool.method) {
    throw new OtokAiValidationError(`MCP tool ${tool.name} only supports ${tool.method}`);
  }

  const url = new URL(tool.route, "http://localhost");
  for (const [key, value] of Object.entries(parseMcpToolArguments(args))) {
    url.searchParams.set(key, value);
  }

  const response = await fetchImpl(url.pathname + url.search, {
    ...init,
    method: tool.method,
  });
  const contentType = response.headers.get("content-type") ?? "";
  const result = contentType.includes("application/json") ? await response.json() : await response.text();
  return { status: response.status, result };
}

const FORWARDED_REQUEST_HEADERS = new Set(["authorization", "cookie", "x-csrf-token"]);

/** Forward auth-related headers from the MCP HTTP request into internal app.fetch calls. */
export function forwardMcpRequestHeaders(
  source: Record<string, string | string[] | undefined> | undefined,
): Headers | undefined {
  if (!source) return undefined;
  const headers = new Headers();
  for (const [key, raw] of Object.entries(source)) {
    if (raw === undefined) continue;
    const value = Array.isArray(raw) ? raw.join(", ") : raw;
    if (!value) continue;
    const lower = key.toLowerCase();
    if (FORWARDED_REQUEST_HEADERS.has(lower) || lower.startsWith("x-request-")) {
      headers.set(key, value);
    }
  }
  return [...headers.keys()].length > 0 ? headers : undefined;
}

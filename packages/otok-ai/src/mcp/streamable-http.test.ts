import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { serve, type ServerType } from "@hono/node-server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  DEFAULT_NEGOTIATED_PROTOCOL_VERSION,
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
} from "@modelcontextprotocol/sdk/types.js";
import { request as httpRequest } from "node:http";
import { mountMcpRoutes } from "./server.js";

function createMcpTestApp(options?: { allowedRoutes?: readonly string[] }) {
  const allowedRoutes = options?.allowedRoutes ?? ["/public"];
  const app = new Hono();
  app.use("/private", async (c, next) => {
    if (!c.req.header("authorization")) {
      return c.json({ error: "unauthorized" }, 401);
    }
    await next();
  });
  app.get("/public", (c) => c.json({ ok: true, scope: "public" }));
  app.get("/private", (c) => c.json({ ok: true, scope: "private" }));
  app.get("/admin", (c) => c.json({ admin: true }));

  return { app, allowedRoutes };
}

async function mountMcpTestRoutes(app: Hono, allowedRoutes: readonly string[]): Promise<void> {
  await mountMcpRoutes(app, {
    path: "/api/mcp",
    streamablePath: "/api/mcp/stream",
    allowedRoutes,
    fetchImpl: (path, init) => Promise.resolve(app.request(path, init)),
  });
}

async function readJsonResponse(response: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of response) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : null;
}

describe("legacy otok-mcp v1", () => {
  it("still serves discovery and /call", async () => {
    const { app, allowedRoutes } = createMcpTestApp();
    await mountMcpTestRoutes(app, allowedRoutes);
    const discovery = await app.request("/api/mcp");
    expect(discovery.status).toBe(200);
    const discoveryBody = (await discovery.json()) as { protocol: string };
    expect(discoveryBody.protocol).toBe("otok-mcp/1");

    const call = await app.request("/api/mcp/call", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "public", arguments: {} }),
    });
    expect(call.status).toBe(200);
    const callBody = (await call.json()) as { result: unknown };
    expect(callBody.result).toEqual({ ok: true, scope: "public" });
  });
});

describe("MCP Streamable HTTP (official client)", () => {
  let server: ServerType;
  let baseUrl: string;

  beforeAll(async () => {
    const { app, allowedRoutes } = createMcpTestApp({ allowedRoutes: ["/public", "/private"] });
    await mountMcpTestRoutes(app, allowedRoutes);
    await new Promise<void>((resolve) => {
      server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 0 }, (info) => {
        baseUrl = `http://127.0.0.1:${info.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("initialize, tools/list, and tools/call succeed", async () => {
    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/api/mcp/stream`));
    const client = new Client({ name: "otok-ai-test", version: "1.0.0" });
    await client.connect(transport);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual(["private", "public"]);

    const allowed = await client.callTool({ name: "public", arguments: {} });
    expect(JSON.stringify(allowed)).toContain("scope");
    expect(JSON.stringify(allowed)).toContain("public");

    const denied = await client.callTool({ name: "private", arguments: {} });
    expect(denied.isError).toBe(true);
    expect(JSON.stringify(denied)).toContain("401");

    await transport.close();
  });
});

describe("MCP Streamable HTTP protocol headers (Node HTTP)", () => {
  let server: ServerType;
  let port: number;
  let sessionId: string;

  beforeAll(async () => {
    const { app, allowedRoutes } = createMcpTestApp();
    await mountMcpTestRoutes(app, allowedRoutes);
    await new Promise<void>((resolve) => {
      server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 0 }, (info) => {
        port = info.port;
        resolve();
      });
    });

    const initBody = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" },
      },
    });

    const initResponse = await new Promise<import("node:http").IncomingMessage>((resolve, reject) => {
      const req = httpRequest(
        {
          hostname: "127.0.0.1",
          port,
          method: "POST",
          path: "/api/mcp/stream",
          headers: {
            accept: "application/json, text/event-stream",
            "content-type": "application/json",
            "content-length": Buffer.byteLength(initBody),
          },
        },
        resolve,
      );
      req.on("error", reject);
      req.write(initBody);
      req.end();
    });

    expect(initResponse.statusCode).toBe(200);
    sessionId = String(initResponse.headers["mcp-session-id"]);
    expect(sessionId).toBeTruthy();

    const initializedBody = JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" });
    await new Promise<void>((resolve, reject) => {
      const req = httpRequest(
        {
          hostname: "127.0.0.1",
          port,
          method: "POST",
          path: "/api/mcp/stream",
          headers: {
            accept: "application/json, text/event-stream",
            "content-type": "application/json",
            "content-length": String(Buffer.byteLength(initializedBody)),
            "mcp-session-id": sessionId,
            "mcp-protocol-version": DEFAULT_NEGOTIATED_PROTOCOL_VERSION,
          },
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve());
        },
      );
      req.on("error", reject);
      req.write(initializedBody);
      req.end();
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  function postMcp(
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<{ status: number; body: unknown }> {
    const payload = JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const req = httpRequest(
        {
          hostname: "127.0.0.1",
          port,
          method: "POST",
          path: "/api/mcp/stream",
          headers: {
            accept: "application/json, text/event-stream",
            "content-type": "application/json",
            "content-length": Buffer.byteLength(payload),
            "mcp-session-id": sessionId,
            "mcp-protocol-version": DEFAULT_NEGOTIATED_PROTOCOL_VERSION,
            ...headers,
          },
        },
        async (res) => {
          resolve({ status: res.statusCode ?? 0, body: await readJsonResponse(res) });
        },
      );
      req.on("error", reject);
      req.write(payload);
      req.end();
    });
  }

  it("returns HTTP 400 for unsupported MCP-Protocol-Version", async () => {
    const result = await postMcp(
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
      { "mcp-protocol-version": "2099-01-01" },
    );
    expect(result.status).toBe(400);
  });

  it("returns HTTP 400 when Mcp-Session-Id contains multiple comma-separated values", async () => {
    const result = await postMcp(
      { jsonrpc: "2.0", id: 3, method: "tools/list", params: {} },
      { "mcp-session-id": `${sessionId}, other-session` },
    );
    expect(result.status).toBe(400);
  });

  it("uses the last comma-separated MCP-Protocol-Version value (0.3.4+ behavior)", async () => {
    const supportedLast = SUPPORTED_PROTOCOL_VERSIONS[SUPPORTED_PROTOCOL_VERSIONS.length - 1]!;
    const fail = await postMcp(
      { jsonrpc: "2.0", id: 4, method: "tools/list", params: {} },
      { "mcp-protocol-version": `${supportedLast}, 2099-01-01` },
    );
    expect(fail.status).toBe(400);

    const ok = await postMcp(
      { jsonrpc: "2.0", id: 5, method: "tools/list", params: {} },
      { "mcp-protocol-version": `2099-01-01, ${supportedLast}` },
    );
    expect(ok.status).toBe(200);
    expect((ok.body as { result?: { tools?: unknown[] } }).result?.tools?.length).toBeGreaterThan(0);
  });

  it("handles duplicate MCP-Protocol-Version values merged into one comma-separated header", async () => {
    const supportedLast = SUPPORTED_PROTOCOL_VERSIONS[SUPPORTED_PROTOCOL_VERSIONS.length - 1]!;
    const result = await postMcp(
      { jsonrpc: "2.0", id: 6, method: "tools/list", params: {} },
      { "mcp-protocol-version": `2099-01-01, ${supportedLast}` },
    );
    expect(result.status).toBe(200);
  });

  it("merges repeated MCP-Protocol-Version headers into a comma-separated list (fetch append)", async () => {
    const supportedLast = SUPPORTED_PROTOCOL_VERSIONS[SUPPORTED_PROTOCOL_VERSIONS.length - 1]!;
    const payload = JSON.stringify({ jsonrpc: "2.0", id: 7, method: "tools/list", params: {} });
    const headers = new Headers({
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "mcp-session-id": sessionId,
      "mcp-protocol-version": "2099-01-01",
    });
    headers.append("mcp-protocol-version", supportedLast);

    const response = await fetch(`http://127.0.0.1:${port}/api/mcp/stream`, {
      method: "POST",
      headers,
      body: payload,
    });
    expect(response.status).toBe(200);
  });
});

describe("MCP tool authorization", () => {
  it("does not reach disallowed legacy tools", async () => {
    const fetchSpy = vi.fn(async () => new Response("{}"));
    const app = new Hono();
    await mountMcpRoutes(app, {
      path: "/api/mcp",
      streamablePath: "/api/mcp/stream",
      allowedRoutes: ["/public"],
      fetchImpl: fetchSpy,
    });

    const denied = await app.request("/api/mcp/call", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "admin", arguments: {} }),
    });
    expect(denied.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("MCP argument validation", () => {
  it("rejects reserved argument keys on legacy /call", async () => {
    const { app, allowedRoutes } = createMcpTestApp();
    await mountMcpTestRoutes(app, allowedRoutes);
    const res = await app.request("/api/mcp/call", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "public", arguments: { route: "/admin" } }),
    });
    expect(res.status).toBe(400);
  });
});

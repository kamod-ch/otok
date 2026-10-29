# MCP endpoints in `@kamod-ch/otok-ai`

## Dependencies

| Surface                  | npm packages required                                          |
| ------------------------ | -------------------------------------------------------------- |
| Legacy `otok-mcp/1` only | `@kamod-ch/otok-ai` (no extra MCP deps)                        |
| Streamable HTTP          | `@hono/mcp` (≥ 0.3.4) and `@modelcontextprotocol/sdk` (≥ 1.29) |

The `ai()` plugin loads Streamable MCP **only when** `mcpStreamablePath` is set (default `/api/mcp/stream`). Disable it with `mcpStreamablePath: false` if you do not install the peer packages.

Direct imports from `@kamod-ch/otok-ai/mcp` (`mountStreamableMcpRoutes`, `createStreamableMcpServer`) always require those peers.

## Legacy `otok-mcp/1`

- **Discovery:** `GET {mcpPath}` → `{ protocol: "otok-mcp/1", tools: [...] }`
- **Invoke:** `POST {mcpPath}/call` with `{ name, arguments }`
- **Use when:** existing Otok-specific integrations already target this shape.

## Standard Streamable HTTP

- **Path:** `{mcpStreamablePath}` (default `/api/mcp/stream`, disable with `mcpStreamablePath: false`)
- **Transport:** `@hono/mcp` `StreamableHTTPTransport`
- **Methods:** `GET` (SSE), `POST` (JSON-RPC), `DELETE` (session teardown)
- **Use when:** connecting spec-compliant MCP clients (Cursor, Claude Desktop HTTP mode, SDK `StreamableHTTPClientTransport`, etc.)

### Client example

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({ name: "my-app", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(new URL("https://app.example/api/mcp/stream"));
await client.connect(transport);
const tools = await client.listTools();
```

### Protocol version headers

`@hono/mcp` 0.3.4+ validates `MCP-Protocol-Version` by splitting comma-separated values and using the **last** entry. Prefer a single header value; some HTTP stacks merge duplicate header lines into one comma-separated value (then the last segment wins).

## Shared rules

- Tools are built only from `mcpRoutes` (explicit allowlist, GET proxy).
- Tool arguments become query string parameters; reserved keys are rejected.
- Internal fetches reuse `app.request()` and forward `Authorization`, `Cookie`, and CSRF-related headers from the MCP HTTP request.

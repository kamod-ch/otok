# @kamod-ch/otok-realtime

Typed SSE and WebSocket realtime for Otok — channels, rooms, presence, reconnect, and scalable providers.

## Install

```bash
pnpm add @kamod-ch/otok-realtime
```

## Define channels

```ts
import { defineChannel, z } from "@kamod-ch/otok-realtime";

const companiesChannel = defineChannel({
  name: "companies",
  authorize: ({ user }) => Boolean(user),
  schema: z.object({ note: z.string() }),
});
```

## Plugin

```ts
import realtime from "@kamod-ch/otok-realtime/plugin";

export default defineConfig({
  plugins: [realtime({ channels: { companies: companiesChannel } })],
});
```

## Publish

```ts
import { realtime } from "@kamod-ch/otok-realtime";

await realtime.publish(companiesChannel, "acme", "activity", { note: "Called client" });
```

## Client (fetch SSE with auth header)

```ts
import { fetchSseClient } from "@kamod-ch/otok-realtime/client";

await fetchSseClient({
  url: "/realtime/sse",
  channel: "companies",
  room: "acme",
  getToken: async () => accessToken,
  lastEventId: previousId,
  onEvent: (event) => console.log(event),
});
```

## Security

- Tokens **must not** be passed via query parameters (rejected with 400)
- Use `Authorization: Bearer` header or session cookies
- Integrates with `@kamod-ch/otok-auth`, `@kamod-ch/otok-security`, `@kamod-ch/otok-observability`

## Providers

| Provider | Use case |
|----------|----------|
| `memory` | Dev / single instance |
| `redis` | Multi-instance horizontal scaling |
| `durable-objects` | Cloudflare Workers contract |

## CRM example

See `examples/crm-realtime/` and `@kamod-ch/otok-realtime/crm`.

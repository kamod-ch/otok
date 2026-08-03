# otok-realtime architecture

## Layers

```
App routes / actions
       │ publish()
       ▼
  RealtimeHub ──► RealtimeProvider (memory | redis | DO)
       │
       ├── SSE transport (/realtime/sse/:channel/:room)
       └── WebSocket transport (handleWebSocketConnection)
```

## Auth

- **Allowed:** `Authorization: Bearer`, session cookie via otok-auth context
- **Forbidden:** query parameter tokens (`?token=`, `?access_token=` — rejected with 400)
- Tokens redacted in logs via `redactTokens()`

## Reconnect & resume

- SSE: `Last-Event-ID` header on reconnect
- WebSocket: `{ type: "subscribe", lastEventId }` on connect
- Memory provider retains event history for replay

## Multi-instance

- **memory:** single process
- **redis:** `createRedisProvider(adapter)` pub/sub across nodes
- **durable-objects:** contract in `@kamod-ch/otok-realtime/providers/durable-objects`

## Integrations

| Package | Integration |
|---------|-------------|
| otok-auth | Session user via `contextUserKey` / `getSession` |
| otok-security | Rate limits via hub connection limits + optional middleware |
| otok-observability | `x-request-id` propagated to authorize context |

## Backpressure

When pending events exceed `maxPendingEventsPerConnection`, oldest events are dropped and a `BACKPRESSURE` error is sent.

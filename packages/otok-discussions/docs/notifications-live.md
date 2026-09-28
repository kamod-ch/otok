# Notifications & live updates (optional)

These capabilities are **optional entrypoints** — the core plugin, SSR pages, and JSON API work without them.

## Notifications (`@kamod-ch/otok-discussions/notifications`)

- **Reply** and **mention** subscriptions only; defaults are opt-out (`replyOptIn` / `mentionOptIn` false).
- Wire `attachNotificationBridge(runtime, { subscriptions, enqueue, isRecipientActive? })` **before** creating the Kysely/memory adapter so the shared `EventSink` receives bridged events.
- Enqueue via `@kamod-ch/otok-queue` using `createQueueNotificationEnqueue(queue)` — delivery is at-least-once; `deliveryKey` on each job is the stable idempotency key.
- Process jobs with `createNotificationJobHandler({ provider, subscriptions })`. Ship `createLogNotificationProvider()` for tests; email/push stay in the app layer.
- Optional preference routes: pass `notificationPreferences` to `createDiscussions()` and call `extension.configureNotificationPreferences?.(app)`.

## Live updates (`@kamod-ch/otok-discussions/live`)

- SSE/WebSocket lifecycle, `Last-Event-ID` replay, abort, connection limits, and shutdown are delegated to `@kamod-ch/otok-realtime`.
- Register `createDiscussionsLiveChannel({ canAccessThread })` in the realtime plugin; room keys from `discussionThreadRoomKey(subject, threadId)` (URL-encode the room path segment).
- `attachLiveUpdatesBridge(runtime, { hub, channel })` publishes **reference-only** events (no bodies, no moderation metadata). Clients reload via authorized HTTP.
- Live updates complement SSR — keep explicit refresh on connection errors.

## Peer dependencies

`@kamod-ch/otok-queue` and `@kamod-ch/otok-realtime` are optional peers when using these subpaths.

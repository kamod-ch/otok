# CRM realtime example

Live CRM activity feed and presence using `@kamod-ch/otok-realtime`.

```ts
import { RealtimeHub, companiesChannel } from "@kamod-ch/otok-realtime";
import { createMemoryProvider } from "@kamod-ch/otok-realtime";

const hub = new RealtimeHub({ provider: createMemoryProvider() });

// Viewer subscribes to company room
await hub.connect({
  user: { id: "agent-1" },
  channel: companiesChannel,
  room: "acme",
  transport: "sse",
  push: (event) => { /* update UI */ return true; },
  onClose: () => {},
});

// Activity created elsewhere
await hub.publish(companiesChannel, "acme", "activity", {
  activityId: "a1",
  companyId: "acme",
  note: "Discovery call completed",
  createdBy: "agent-2",
  createdAt: new Date().toISOString(),
});
```

Run tests: `pnpm --filter @kamod-ch/otok-realtime test`

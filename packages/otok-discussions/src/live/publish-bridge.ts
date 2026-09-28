import type { DiscussionDomainEvent, EventSink } from "../types/ports.js";
import type { RealtimeHub } from "@kamod-ch/otok-realtime";
import type { ChannelDefinition } from "@kamod-ch/otok-realtime";
import { discussionThreadRoomKey } from "./room-key.js";
import { toDiscussionLiveEvent, type DiscussionLiveEvent } from "./public-payload.js";

export interface DiscussionsLiveBridgeConfig {
  hub: RealtimeHub;
  channel: ChannelDefinition<DiscussionLiveEvent>;
}

export function createLiveEventSink(inner: EventSink, config: DiscussionsLiveBridgeConfig): EventSink {
  return {
    emit(event: DiscussionDomainEvent) {
      const run = async () => {
        await Promise.resolve(inner.emit(event));
        const live = toDiscussionLiveEvent(event);
        if (!live) return;
        const room = discussionThreadRoomKey(event.subject, live.threadId);
        await config.hub.publish(config.channel, room, live.name, live);
      };
      return run();
    },
  };
}

export function attachLiveUpdatesBridge(
  runtime: import("../config.js").DiscussionsRuntime,
  config: DiscussionsLiveBridgeConfig,
): void {
  runtime.deps.events = createLiveEventSink(runtime.deps.events, config);
}

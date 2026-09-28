import { defineChannel } from "@kamod-ch/otok-realtime";
import type { RealtimeUser } from "@kamod-ch/otok-realtime";
import { discussionLiveEventSchema } from "./public-payload.js";
import { parseDiscussionThreadRoomKey } from "./room-key.js";

export interface DiscussionsThreadAccessContext {
  user: RealtimeUser | null;
  tenantId: string;
  subjectType: string;
  subjectId: string;
  threadId: string;
}

export interface CreateDiscussionsLiveChannelOptions {
  canAccessThread: (ctx: DiscussionsThreadAccessContext) => boolean | Promise<boolean>;
  /** Per-room subscriber cap (otok-realtime enforces via provider). */
  maxRoomSize?: number;
}

/**
 * Typed otok-realtime channel — SSE/WebSocket lifecycle delegated to `@kamod-ch/otok-realtime`
 * (AbortSignal, Last-Event-ID, hub shutdown, connection limits).
 */
export function createDiscussionsLiveChannel(options: CreateDiscussionsLiveChannelOptions) {
  return defineChannel({
    name: "discussions-thread",
    schema: discussionLiveEventSchema,
    maxRoomSize: options.maxRoomSize ?? 500,
    authorize: async ({ user, room }) => {
      if (!room) return false;
      const parsed = parseDiscussionThreadRoomKey(room);
      if (!parsed) return false;
      return options.canAccessThread({
        user,
        tenantId: parsed.tenantId,
        subjectType: parsed.subjectType,
        subjectId: parsed.subjectId,
        threadId: parsed.threadId,
      });
    },
  });
}

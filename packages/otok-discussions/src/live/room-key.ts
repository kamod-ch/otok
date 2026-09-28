import type { DiscussionSubject } from "../types/domain.js";

const ROOM_PREFIX = "v1";

export function discussionThreadRoomKey(subject: DiscussionSubject, threadId: string): string {
  return [
    ROOM_PREFIX,
    encodeURIComponent(subject.tenantId),
    encodeURIComponent(subject.subjectType),
    encodeURIComponent(subject.subjectId),
    encodeURIComponent(threadId),
  ].join("/");
}

export function parseDiscussionThreadRoomKey(room: string): (DiscussionSubject & { threadId: string }) | null {
  const parts = room.split("/");
  if (parts.length !== 5 || parts[0] !== ROOM_PREFIX) return null;
  try {
    return {
      tenantId: decodeURIComponent(parts[1]!),
      subjectType: decodeURIComponent(parts[2]!),
      subjectId: decodeURIComponent(parts[3]!),
      threadId: decodeURIComponent(parts[4]!),
    };
  } catch {
    return null;
  }
}

import type { DiscussionDomainEvent, EventSink } from "../types/ports.js";
import { parseMentionUserIds } from "./mention-parse.js";
import type { NotificationsBridgeConfig, NotificationJobPayload } from "./types.js";

function deliveryKey(parts: { kind: string; commentId: string; recipientUserId: string }): string {
  return `discussions:notify:${parts.kind}:${parts.commentId}:${parts.recipientUserId}`;
}

async function handleCommentCreated(
  event: DiscussionDomainEvent,
  config: NotificationsBridgeConfig,
  payload: Record<string, unknown>,
): Promise<void> {
  const commentId = String(payload.commentId ?? "");
  const threadId = String(payload.threadId ?? "");
  const authorId = String(payload.authorId ?? "");
  const status = String(payload.status ?? "");
  if (!commentId || !threadId || !authorId) return;
  if (status !== "published") return;

  const parentAuthorId = payload.parentAuthorId ? String(payload.parentAuthorId) : null;
  const bodyForMentions = typeof payload.mentionScanBody === "string" ? payload.mentionScanBody : "";

  const jobs: NotificationJobPayload[] = [];

  if (parentAuthorId && parentAuthorId !== authorId) {
    jobs.push({
      deliveryKey: deliveryKey({ kind: "reply", commentId, recipientUserId: parentAuthorId }),
      kind: "reply",
      tenantId: event.tenantId,
      subject: event.subject,
      threadId,
      commentId,
      recipientUserId: parentAuthorId,
      actorUserId: authorId,
      occurredAt: event.occurredAt,
    });
  }

  for (const mentionedId of parseMentionUserIds(bodyForMentions)) {
    if (mentionedId === authorId) continue;
    jobs.push({
      deliveryKey: deliveryKey({ kind: "mention", commentId, recipientUserId: mentionedId }),
      kind: "mention",
      tenantId: event.tenantId,
      subject: event.subject,
      threadId,
      commentId,
      recipientUserId: mentionedId,
      actorUserId: authorId,
      occurredAt: event.occurredAt,
    });
  }

  for (const job of jobs) {
    if (config.isRecipientActive && !(await config.isRecipientActive(job.tenantId, job.recipientUserId))) {
      continue;
    }
    const prefs = await config.subscriptions.getPreferences(job.tenantId, job.recipientUserId);
    const optedIn = job.kind === "reply" ? prefs.replyOptIn : prefs.mentionOptIn;
    if (!optedIn) continue;
    await config.enqueue.enqueue(job);
  }
}

export function createNotificationEventSink(inner: EventSink, config: NotificationsBridgeConfig): EventSink {
  return {
    emit(event: DiscussionDomainEvent) {
      const run = async () => {
        await Promise.resolve(inner.emit(event));
        if (event.name === "discussion.comment.created") {
          await handleCommentCreated(event, config, event.payload);
        }
      };
      return run();
    },
  };
}

/** Mutates runtime deps in place so adapters and services share the bridged sink. */
export function attachNotificationBridge(
  runtime: import("../config.js").DiscussionsRuntime,
  config: NotificationsBridgeConfig,
): void {
  runtime.deps.events = createNotificationEventSink(runtime.deps.events, config);
}

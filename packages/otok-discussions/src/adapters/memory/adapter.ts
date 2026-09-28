import { createDiscussionsRuntime, type DiscussionsConfigInput, type DiscussionsRuntimeDeps } from "../../config.js";
import { DiscussionEngine } from "../../engine/discussion-engine.js";
import { DiscussionError } from "../../types/errors.js";
import type { DiscussionAdapter } from "../../types/ports.js";
import { MEMORY_ADAPTER_LOCALITY, MemoryDiscussionStore } from "./store.js";

export interface MemoryDiscussionAdapterOptions {
  deps: DiscussionsRuntimeDeps;
  config?: DiscussionsConfigInput;
  store?: MemoryDiscussionStore;
  capabilities?: Partial<DiscussionAdapter["capabilities"]>;
}

/**
 * **Non-production adapter** — {@link MEMORY_ADAPTER_LOCALITY}.
 */
export function createMemoryDiscussionAdapter(options: MemoryDiscussionAdapterOptions): DiscussionAdapter {
  const runtime = createDiscussionsRuntime(options.config ?? {}, options.deps);
  const store = options.store ?? new MemoryDiscussionStore();
  const engine = new DiscussionEngine(store, runtime);

  const capabilities = {
    read: true,
    mutate: true,
    moderate: true,
    transactional: false,
    ...options.capabilities,
  };

  const adapter = {
    capabilities,
    read: {
      getThread: async (subject, threadId) => {
        const thread = await store.findThread(subject, threadId);
        return thread ? engine.materializeThread(thread) : null;
      },
      listThreads: async (query) => {
        const limit = Math.min(query.limit ?? runtime.config.pagination.defaultPageSize, 100);
        const all = await Promise.all(
          (await store.listThreadsForSubject(query.subject)).map((t) => engine.materializeThread(t)),
        );
        let start = 0;
        if (query.cursor) {
          const idx = all.findIndex((t) => t.id === query.cursor);
          start = idx >= 0 ? idx + 1 : 0;
        }
        const page = all.slice(start, start + limit);
        return {
          items: page,
          nextCursor: page.length === limit ? page[page.length - 1]?.id : undefined,
        };
      },
      getComment: async (subject, commentId) => store.findComment(subject, commentId),
      listComments: async (query) => engine.listComments(query),
      listRevisions: async (_subject, commentId) => store.listRevisions(commentId),
      listReactions: async (subject, commentId) => {
        const comment = await store.findComment(subject, commentId);
        if (!comment) return [];
        return store.listReactionsForComment(commentId);
      },
    },
    mutate: {
      createThread: async (input) => engine.createThread(input),
      createComment: async (input) => engine.createComment(input),
      updateComment: async (input) => engine.updateComment(input),
      deleteComment: async (subject, commentId) => engine.deleteCommentWithPlaceholder(subject, commentId),
      addReaction: async (subject, commentId, actorId, emoji) => engine.addReaction(subject, commentId, actorId, emoji),
      removeReaction: async (subject, reactionId, actorId) => engine.removeReaction(subject, reactionId, actorId),
    },
    moderate: {
      setCommentStatus: async (subject, commentId, status, _moderatorId) =>
        engine.setCommentStatus(subject, commentId, status),
      transitionThread: async (subject, threadId, to, _moderatorId) => engine.transitionThread(subject, threadId, to),
      pinThread: async (subject, threadId, _moderatorId, pinRank) => {
        const thread = await store.findThread(subject, threadId);
        if (!thread) throw new DiscussionError("NOT_FOUND", "Thread not found");
        const now = runtime.deps.clock.now().toISOString();
        const updated = { ...thread, pinnedAt: now, pinRank: pinRank ?? 0, updatedAt: now };
        await store.saveThread(updated);
        return updated;
      },
      unpinThread: async (subject, threadId, _moderatorId) => {
        const thread = await store.findThread(subject, threadId);
        if (!thread) throw new DiscussionError("NOT_FOUND", "Thread not found");
        const now = runtime.deps.clock.now().toISOString();
        const updated = { ...thread, pinnedAt: null, pinRank: null, updatedAt: now };
        await store.saveThread(updated);
        return updated;
      },
      highlightComment: async (subject, commentId, _moderatorId) => {
        const comment = await store.findComment(subject, commentId);
        if (!comment) throw new DiscussionError("NOT_FOUND", "Comment not found");
        const now = runtime.deps.clock.now().toISOString();
        const updated = { ...comment, highlightedAt: now, updatedAt: now };
        await store.saveComment(updated);
        return updated;
      },
      createReport: async (input) => engine.createReport(input),
      recordModerationAction: async (input) => {
        const now = runtime.deps.clock.now().toISOString();
        const action = { id: runtime.deps.ids.createId("mod"), createdAt: now, ...input };
        await store.appendModerationAction(action);
        return action;
      },
    },
  } satisfies DiscussionAdapter;

  return Object.assign(adapter, { _store: store }) as DiscussionAdapter & { _store: MemoryDiscussionStore };
}

export { MEMORY_ADAPTER_LOCALITY };

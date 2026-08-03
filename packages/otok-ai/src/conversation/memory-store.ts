import type { AiMessage, AiConversationStore } from "../types.js";

export function createMemoryConversationStore(): AiConversationStore {
  const store = new Map<string, AiMessage[]>();

  return {
    async get(conversationId) {
      return store.get(conversationId) ?? null;
    },
    async append(conversationId, messages) {
      const existing = store.get(conversationId) ?? [];
      store.set(conversationId, [...existing, ...messages]);
    },
    async clear(conversationId) {
      store.delete(conversationId);
    },
  };
}

export function resetMemoryConversationStore(store: AiConversationStore & { _reset?: () => void }): void {
  store._reset?.();
}

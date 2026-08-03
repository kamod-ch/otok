/** RAG document chunk returned from retrieval. */
export interface RagDocument {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/** Adapter for retrieval-augmented generation. */
export interface RagAdapter {
  retrieve(query: string, options?: { topK?: number; filter?: Record<string, unknown> }): Promise<RagDocument[]>;
  ingest?(documents: Array<{ id: string; content: string; metadata?: Record<string, unknown> }>): Promise<void>;
}

/** Embedding provider — may delegate to AiProvider.embed. */
export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
  dimensions: number;
  model: string;
}

/** Vector store for semantic search. */
export interface VectorStore {
  upsert(items: Array<{ id: string; vector: number[]; metadata?: Record<string, unknown> }>): Promise<void>;
  query(vector: number[], options?: { topK?: number; filter?: Record<string, unknown> }): Promise<
    Array<{ id: string; score: number; metadata?: Record<string, unknown> }>
  >;
  delete?(ids: string[]): Promise<void>;
}

/** Compose RAG adapter from embedding provider + vector store. */
export function createRagAdapter(embedding: EmbeddingProvider, store: VectorStore): RagAdapter {
  return {
    async retrieve(query, options) {
      const [vector] = await embedding.embed([query]);
      const results = await store.query(vector, { topK: options?.topK ?? 5, filter: options?.filter });
      return results.map((r) => ({
        id: r.id,
        content: String(r.metadata?.content ?? ""),
        score: r.score,
        metadata: r.metadata,
      }));
    },
    async ingest(documents) {
      const vectors = await embedding.embed(documents.map((d) => d.content));
      await store.upsert(
        documents.map((d, i) => ({
          id: d.id,
          vector: vectors[i] ?? [],
          metadata: { ...d.metadata, content: d.content },
        })),
      );
    },
  };
}

export function createMemoryVectorStore(): VectorStore {
  const items = new Map<string, { vector: number[]; metadata?: Record<string, unknown> }>();
  return {
    async upsert(entries) {
      for (const e of entries) items.set(e.id, { vector: e.vector, metadata: e.metadata });
    },
    async query(vector, options) {
      const scored = [...items.entries()].map(([id, item]) => ({
        id,
        score: cosineSimilarity(vector, item.vector),
        metadata: item.metadata,
      }));
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, options?.topK ?? 5);
    },
    async delete(ids) {
      for (const id of ids) items.delete(id);
    },
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i += 1) {
    dot += a[i]! * b[i]!;
    na += a[i]! ** 2;
    nb += b[i]! ** 2;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export interface SearchDocument {
  id: string;
  tenantId: string;
  type: string;
  fields: Record<string, string | undefined>;
}

export interface SearchQuery {
  tenantId: string;
  type?: string;
  q?: string;
  limit?: number;
}

export interface SearchHit {
  id: string;
  type: string;
  score: number;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[\s,.-]+/).filter(Boolean);
}

/** In-memory search index — swap for OpenSearch/Postgres FTS in production. */
export class SearchIndex {
  private readonly docs = new Map<string, SearchDocument>();

  upsert(doc: SearchDocument): void {
    this.docs.set(`${doc.tenantId}:${doc.type}:${doc.id}`, doc);
  }

  remove(tenantId: string, type: string, id: string): void {
    this.docs.delete(`${tenantId}:${type}:${id}`);
  }

  search(query: SearchQuery): SearchHit[] {
    const qTokens = query.q ? tokenize(query.q) : [];
    const hits: SearchHit[] = [];

    for (const doc of this.docs.values()) {
      if (doc.tenantId !== query.tenantId) continue;
      if (query.type && doc.type !== query.type) continue;

      const haystack = tokenize(Object.values(doc.fields).filter(Boolean).join(" "));
      let score = qTokens.length === 0 ? 1 : 0;
      for (const token of qTokens) {
        if (haystack.some((h) => h.includes(token) || token.includes(h))) score += 1;
      }
      if (qTokens.length === 0 || score > 0) {
        hits.push({ id: doc.id, type: doc.type, score: score / Math.max(qTokens.length, 1) });
      }
    }

    return hits
      .sort((a, b) => b.score - a.score)
      .slice(0, query.limit ?? 50);
  }

  clear(): void {
    this.docs.clear();
  }
}

let defaultIndex: SearchIndex | null = null;

export function getSearchIndex(): SearchIndex {
  if (!defaultIndex) defaultIndex = new SearchIndex();
  return defaultIndex;
}

export function resetSearchIndexForTests(): void {
  defaultIndex = null;
}

export function indexCompany(
  index: SearchIndex,
  tenantId: string,
  company: {
    id: string;
    name: string;
    uid?: string;
    city?: string;
    canton?: string;
    industry?: string;
  },
): void {
  index.upsert({
    id: company.id,
    tenantId,
    type: "company",
    fields: {
      name: company.name,
      uid: company.uid,
      city: company.city,
      canton: company.canton,
      industry: company.industry,
    },
  });
}

export { default, configureSearchApp } from "./plugin.js";
export type { SearchPluginOptions } from "./plugin.js";

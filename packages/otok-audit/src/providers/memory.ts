import type { AuditEntry, AuditSearchQuery, AuditSearchResult, AuditStore } from "../types.js";

export class MemoryAuditStore implements AuditStore {
  private readonly entries: AuditEntry[] = [];

  async append(entry: AuditEntry): Promise<void> {
    if (this.entries.some((e) => e.id === entry.id)) {
      throw new Error("otok-audit: duplicate audit entry id — store is append-only");
    }
    this.entries.push(structuredClone(entry));
  }

  async getById(id: string, tenantId: string): Promise<AuditEntry | null> {
    return this.entries.find((e) => e.id === id && e.tenantId === tenantId) ?? null;
  }

  async search(query: AuditSearchQuery): Promise<AuditSearchResult> {
    const limit = Math.min(query.limit ?? 50, 500);
    let filtered = this.entries.filter((e) => e.tenantId === query.tenantId);

    if (query.action) {
      const actions = Array.isArray(query.action) ? query.action : [query.action];
      filtered = filtered.filter((e) => actions.includes(e.action));
    }
    if (query.resourceType) {
      filtered = filtered.filter((e) => e.resource.type === query.resourceType);
    }
    if (query.resourceId) {
      filtered = filtered.filter((e) => e.resource.id === query.resourceId);
    }
    if (query.actorId) {
      filtered = filtered.filter((e) => e.actor.id === query.actorId);
    }
    if (query.from) {
      filtered = filtered.filter((e) => e.occurredAt >= query.from!);
    }
    if (query.to) {
      filtered = filtered.filter((e) => e.occurredAt <= query.to!);
    }
    if (query.q) {
      const q = query.q.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.action.toLowerCase().includes(q) ||
          e.resource.type.toLowerCase().includes(q) ||
          e.resource.id.toLowerCase().includes(q) ||
          (e.resource.name?.toLowerCase().includes(q) ?? false),
      );
    }

    filtered.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

    let start = 0;
    if (query.cursor) {
      const idx = filtered.findIndex((e) => e.id === query.cursor);
      start = idx >= 0 ? idx + 1 : 0;
    }

    const page = filtered.slice(start, start + limit);
    const nextCursor = page.length === limit ? page[page.length - 1]?.id : undefined;

    return {
      entries: page,
      nextCursor,
      total: filtered.length,
    };
  }

  /** Test helper — returns internal count. */
  size(): number {
    return this.entries.length;
  }
}

export function createMemoryAuditStore(): MemoryAuditStore {
  return new MemoryAuditStore();
}

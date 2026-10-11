import type { AuditEntry } from "./types.js";

export class AuditLog {
  readonly entries: AuditEntry[] = [];

  record(entry: Omit<AuditEntry, "at">): void {
    this.entries.push({ ...entry, at: new Date().toISOString() });
  }
}

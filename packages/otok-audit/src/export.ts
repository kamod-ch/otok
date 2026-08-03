import { redactAuditEntry } from "./redaction.js";
import type { AuditEntry, AuditExportOptions } from "./types.js";
import { normalizeChanges, serializeJson } from "./types.js";

function escapeCsv(value: unknown): string {
  if (value == null) return "";
  const text = typeof value === "string" ? value : serializeJson(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function exportAuditEntries(
  entries: readonly AuditEntry[],
  options: AuditExportOptions,
): string {
  const rows = entries.map((entry) =>
    redactAuditEntry(entry, options.redactFields),
  );

  if (options.format === "json") {
    return `${serializeJson(rows)}\n`;
  }

  const header = [
    "id",
    "tenantId",
    "occurredAt",
    "action",
    "actorId",
    "actorType",
    "resourceType",
    "resourceId",
    "changes",
    "requestId",
    "correlationId",
  ];

  const lines = [header.join(",")];
  for (const entry of rows) {
    lines.push(
      [
        entry.id,
        entry.tenantId,
        entry.occurredAt,
        entry.action,
        entry.actor.id,
        entry.actor.type,
        entry.resource.type,
        entry.resource.id,
        normalizeChanges(entry.changes),
        entry.requestId,
        entry.correlationId,
      ]
        .map(escapeCsv)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

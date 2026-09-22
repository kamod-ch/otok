export const MAX_IMPORT_ROWS = 20;
export const MAX_CSV_BYTES = 32 * 1024;

export type CsvJobRow = {
  external_ref: string;
  title: string;
  description: string;
  visibility: "public" | "private";
};

export function parseImportCsv(content: string): { rows: CsvJobRow[]; error?: string } {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { rows: [], error: "CSV is empty" };
  const header = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  const required = ["external_ref", "title", "description", "visibility"];
  for (const col of required) {
    if (!header.includes(col)) return { rows: [], error: `Missing column: ${col}` };
  }
  const rows: CsvJobRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (rows.length >= MAX_IMPORT_ROWS) {
      return { rows, error: `Maximum ${MAX_IMPORT_ROWS} data rows allowed` };
    }
    const cells = lines[i]!.split(",").map((c) => c.trim());
    const record: Record<string, string> = {};
    header.forEach((name, idx) => {
      record[name] = cells[idx] ?? "";
    });
    const visibility = record.visibility === "private" ? "private" : "public";
    if (!record.external_ref || !record.title) {
      return { rows, error: `Invalid row ${i + 1}` };
    }
    rows.push({
      external_ref: record.external_ref,
      title: record.title,
      description: record.description || "",
      visibility,
    });
  }
  return { rows };
}

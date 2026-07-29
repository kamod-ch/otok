/** Minimal normalizePath compatible with Vite's helper (no vite dependency). */
export function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

import type { RouteEntry, RoutesScanResult } from "./parser.js";

export type RouteIssueSeverity = "error" | "warning";

export interface RouteIssue {
  severity: RouteIssueSeverity;
  code: string;
  message: string;
  routePath?: string;
  file?: string;
  related?: Array<{ routePath?: string; file?: string }>;
}

export interface AnalyzeRoutesResult {
  issues: RouteIssue[];
  ok: boolean;
}

function issueKey(issue: RouteIssue): string {
  return `${issue.code}:${issue.routePath ?? ""}:${issue.file ?? ""}:${issue.message}`;
}

export function detectRouteConflicts(routes: RouteEntry[]): RouteIssue[] {
  const issues: RouteIssue[] = [];
  const byPath = new Map<string, RouteEntry[]>();

  for (const route of routes) {
    const existing = byPath.get(route.routePath) ?? [];
    existing.push(route);
    byPath.set(route.routePath, existing);
  }

  for (const [routePath, entries] of byPath) {
    if (entries.length <= 1) continue;
    const files = [...new Set(entries.map((entry) => entry.file))];
    if (files.length <= 1) continue;
    issues.push({
      severity: "error",
      code: "ROUTE_CONFLICT",
      message: `Multiple route files resolve to the same path "${routePath}".`,
      routePath,
      file: files[0],
      related: files.slice(1).map((file) => ({ routePath, file })),
    });
  }

  const patterns = new Map<string, RouteEntry[]>();
  for (const route of routes) {
    const existing = patterns.get(route.routePattern) ?? [];
    existing.push(route);
    patterns.set(route.routePattern, existing);
  }

  for (const [pattern, entries] of patterns) {
    const uniquePaths = [...new Set(entries.map((entry) => entry.routePath))];
    if (uniquePaths.length <= 1) continue;
    issues.push({
      severity: "warning",
      code: "OPTIONAL_ROUTE_VARIANTS",
      message: `Route pattern "${pattern}" expands to multiple URL paths: ${uniquePaths.join(", ")}.`,
      routePath: uniquePaths[0],
      file: entries[0]?.file,
      related: entries.slice(1).map((entry) => ({ routePath: entry.routePath, file: entry.file })),
    });
  }

  return issues;
}

export function detectUnreachableRoutes(_routes: RouteEntry[]): RouteIssue[] {
  // Reserved for future path simulation; avoid false positives from static/dynamic siblings.
  return [];
}

export function analyzeRoutes(scan: RoutesScanResult): AnalyzeRoutesResult {
  const issues = dedupeIssues([
    ...detectRouteConflicts(scan.routes),
    ...detectUnreachableRoutes(scan.routes),
  ]);

  return {
    issues,
    ok: !issues.some((issue) => issue.severity === "error"),
  };
}

function dedupeIssues(issues: RouteIssue[]): RouteIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = issueKey(issue);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function formatRouteIssues(issues: RouteIssue[]): string {
  if (issues.length === 0) return "";
  return issues
    .map((issue) => {
      const location = issue.file ? `\n  at ${issue.file}` : "";
      const related =
        issue.related && issue.related.length > 0
          ? `\n  related: ${issue.related.map((item) => item.file ?? item.routePath).join(", ")}`
          : "";
      return `[${issue.severity.toUpperCase()}] ${issue.code}: ${issue.message}${location}${related}`;
    })
    .join("\n\n");
}

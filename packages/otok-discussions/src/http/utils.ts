export function normalizeBasePath(basePath: string): string {
  const trimmed = basePath.trim() || "/discussions";
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.replace(/\/+$/, "") || "/discussions";
}

export function discussionsUrl(basePath: string, suffix: string): string {
  const base = normalizeBasePath(basePath);
  const path = suffix.startsWith("/") ? suffix : `/${suffix}`;
  return `${base}${path}`.replace(/\/{2,}/g, "/");
}

/** Throws when `basePath` overlaps reserved app paths. */
export function assertDiscussionsBasePath(basePath: string, reservedPaths: readonly string[] = []): void {
  const normalized = normalizeBasePath(basePath);
  const reserved = new Set(["/", "/api", "/health", ...reservedPaths.map(normalizeBasePath)]);
  for (const path of reserved) {
    if (normalized === path || normalized.startsWith(`${path}/`)) {
      throw new Error(`@kamod-ch/otok-discussions: basePath "${basePath}" conflicts with reserved path "${path}"`);
    }
  }
}

export function assertNoRouteCollisions(existingPaths: readonly string[], discussionPaths: readonly string[]): void {
  const set = new Set(existingPaths.map((p) => p.replace(/\/+$/, "") || "/"));
  for (const path of discussionPaths) {
    const normalized = path.replace(/\/+$/, "") || "/";
    if (set.has(normalized)) {
      throw new Error(`@kamod-ch/otok-discussions: route collision at "${path}"`);
    }
  }
}

export function safeRedirectPath(location: string, basePath: string): string {
  if (location.startsWith("http://") || location.startsWith("https://")) return location;
  if (location.startsWith("/")) return location;
  return discussionsUrl(basePath, location);
}

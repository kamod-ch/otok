import { defineRendering } from "@kamod-ch/otok/server";
import type { DiscussionSubject } from "../types/domain.js";

export function discussionThreadCacheTag(subject: DiscussionSubject): string {
  return `discussions:thread:${subject.tenantId}:${subject.subjectType}:${subject.subjectId}`;
}

export function discussionTenantCacheTag(tenantId: string): string {
  return `discussions:tenant:${tenantId}`;
}

export function buildThreadCacheInvalidation(
  basePath: string,
  subject: DiscussionSubject,
): { tags: string[]; paths: string[] } {
  const encoded = encodeURIComponent(subject.subjectId);
  const base = basePath.replace(/\/+$/, "") || "";
  return {
    tags: [discussionThreadCacheTag(subject), discussionTenantCacheTag(subject.tenantId)],
    paths: [`${base}/${encoded}`, `${base}/${encoded}/thread`],
  };
}

/** Shared HTML cache is only safe for anonymous readers of published content. */
export function publicDiscussionCacheEligible(input: {
  isAuthenticated: boolean;
  isModerator: boolean;
  containsNonPublishedForViewer: boolean;
}): boolean {
  if (input.isAuthenticated) return false;
  if (input.isModerator) return false;
  if (input.containsNonPublishedForViewer) return false;
  return true;
}

/**
 * Opt-in public HTML cache — only safe when the host wires verified `setOtokCacheScope({ tenantId })`
 * on every request so cache keys cannot collide across tenants (subject id is not in the URL alone).
 */
export const discussionsPublicPageRendering = defineRendering({
  mode: "ssr",
  cache: {
    public: true,
    maxAge: 15,
    sMaxAge: 60,
    staleWhileRevalidate: 120,
    vary: ["Accept-Language"],
    tags: ["discussions:public"],
  },
});

/** Default for bundled plugin routes — avoids cross-tenant HTML cache collisions without host scope. */
export const discussionsSafePageRendering = defineRendering({
  mode: "ssr",
  cache: { noStore: true },
});

export const discussionsModerationRendering = defineRendering({
  mode: "ssr",
  cache: { noStore: true },
});

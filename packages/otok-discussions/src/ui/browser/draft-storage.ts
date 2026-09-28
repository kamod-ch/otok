/** Versioned, untrusted local draft envelope (browser-only). */
export const DISCUSSION_DRAFT_STORAGE_VERSION = 1 as const;

export interface DiscussionDraftEnvelope {
  v: typeof DISCUSSION_DRAFT_STORAGE_VERSION;
  body: string;
  savedAt: string;
}

export function discussionDraftKey(scope: string): string {
  return `kamod:otok-discussion-draft:v${DISCUSSION_DRAFT_STORAGE_VERSION}:${scope}`;
}

export function parseDiscussionDraft(raw: string | null): DiscussionDraftEnvelope | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    if (record.v !== DISCUSSION_DRAFT_STORAGE_VERSION) return null;
    if (typeof record.body !== "string") return null;
    if (typeof record.savedAt !== "string") return null;
    return {
      v: DISCUSSION_DRAFT_STORAGE_VERSION,
      body: record.body.slice(0, 20_000),
      savedAt: record.savedAt,
    };
  } catch {
    return null;
  }
}

export function serializeDiscussionDraft(body: string): string {
  const envelope: DiscussionDraftEnvelope = {
    v: DISCUSSION_DRAFT_STORAGE_VERSION,
    body: body.slice(0, 20_000),
    savedAt: new Date().toISOString(),
  };
  return JSON.stringify(envelope);
}

export function readDiscussionDraft(scope: string): DiscussionDraftEnvelope | null {
  if (typeof localStorage === "undefined") return null;
  return parseDiscussionDraft(localStorage.getItem(discussionDraftKey(scope)));
}

export function writeDiscussionDraft(scope: string, body: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(discussionDraftKey(scope), serializeDiscussionDraft(body));
  } catch {
    /* quota / private mode */
  }
}

export function clearDiscussionDraft(scope: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(discussionDraftKey(scope));
  } catch {
    /* ignore */
  }
}

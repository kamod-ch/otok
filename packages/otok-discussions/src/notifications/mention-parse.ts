/** Parses `@userId` tokens (explicit ids only — no email-like local parts). */
export function parseMentionUserIds(bodyMarkdown: string): string[] {
  const matches = bodyMarkdown.matchAll(/@([a-zA-Z0-9][a-zA-Z0-9_.-]{0,62})/g);
  const ids = new Set<string>();
  for (const m of matches) {
    const id = m[1];
    if (!id.includes("@")) ids.add(id);
  }
  return [...ids];
}

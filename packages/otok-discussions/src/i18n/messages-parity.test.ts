import { describe, expect, it } from "vitest";
import { discussionMessagesDe } from "./messages/de.js";
import { discussionMessagesEn } from "./messages/en.js";

function leafKeys(node: unknown, prefix = ""): string[] {
  if (node === null || typeof node !== "object") return prefix ? [prefix] : [];
  const keys: string[] = [];
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !("other" in (value as object))) {
      keys.push(...leafKeys(value, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

describe("discussion message catalogs", () => {
  it("keeps de/en key parity", () => {
    const deKeys = new Set(leafKeys(discussionMessagesDe).sort());
    const enKeys = new Set(leafKeys(discussionMessagesEn).sort());
    expect([...deKeys]).toEqual([...enKeys]);
  });
});

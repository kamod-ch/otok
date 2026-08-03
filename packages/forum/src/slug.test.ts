import { describe, expect, it } from "vitest";
import {
  buildThreadSlug,
  isCanonicalThreadSlug,
  parseThreadIdFromSlug,
  parseTitleSlugFromComposite,
  slugifyTitle,
} from "./slug.js";

describe("forum slug", () => {
  const id = "550e8400-e29b-41d4-a716-446655440000";

  it("slugifies titles", () => {
    expect(slugifyTitle("Hello World!")).toBe("hello-world");
  });

  it("builds composite thread slug", () => {
    const slug = buildThreadSlug(id, "My Thread");
    expect(slug.startsWith(`${id}--`)).toBe(true);
  });

  it("parses thread id from composite slug", () => {
    const slug = buildThreadSlug(id, "Test");
    expect(parseThreadIdFromSlug(slug)).toBe(id);
  });

  it("parses title slug part", () => {
    const slug = buildThreadSlug(id, "My Thread");
    expect(parseTitleSlugFromComposite(slug)).toBe("my-thread");
  });

  it("detects canonical slug", () => {
    const slug = buildThreadSlug(id, "Title");
    expect(isCanonicalThreadSlug(slug, id, "Title")).toBe(true);
    expect(isCanonicalThreadSlug(`${id}--old-title`, id, "Title")).toBe(false);
  });
});

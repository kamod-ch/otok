import { describe, expect, it } from "vitest";
import { createDiscussionsRuntime, parseDiscussionsConfig } from "./config.js";
import { DiscussionError } from "./types/errors.js";
import { createTestProviders } from "./testing/providers.js";

describe("parseDiscussionsConfig", () => {
  it("applies defaults for empty input", () => {
    const config = parseDiscussionsConfig({});
    expect(config.pagination.defaultPageSize).toBe(20);
    expect(config.moderationMode).toBe("post");
    expect(config.maxDepth).toBe(8);
  });

  it("rejects invalid pagination", () => {
    expect(() => parseDiscussionsConfig({ pagination: { defaultPageSize: 0 } })).toThrow(DiscussionError);
  });

  it("creates runtime when deps are present", () => {
    const deps = createTestProviders();
    const runtime = createDiscussionsRuntime({}, deps);
    expect(runtime.rules.editWindowMs).toBe(900_000);
  });
});

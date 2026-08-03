import { describe, expect, it } from "vitest";
import { defineAction, defineLoader, defineMeta } from "./index.js";

describe("otok/route helpers", () => {
  it("preserves loader return types", () => {
    const loader = defineLoader(async () => ({ count: 1 }));
    expect(typeof loader).toBe("function");
  });

  it("preserves action schema metadata", () => {
    const action = defineAction({
      schema: {
        parse(value: unknown) {
          return { name: String((value as { name?: string }).name ?? "") };
        },
      },
      handler: async ({ input }) => ({ ok: true, name: (input as { name: string }).name }),
    });
    expect(typeof action).toBe("function");
    expect(action.__otokAction).toBeDefined();
  });

  it("wraps meta resolvers", () => {
    const head = defineMeta(({ data }) => ({ title: String(data) }));
    expect(typeof head).toBe("function");
  });
});

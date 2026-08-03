import { describe, expect, it } from "vitest";
import { composeLoader, loaderEnhancer } from "./compose.js";

describe("composeLoader", () => {
  it("chains enhancers outer-to-inner", async () => {
    const loader = composeLoader(
      async (ctx) => ({
        a: (ctx as { a?: number }).a,
        b: (ctx as { b?: number }).b,
      }),
      loaderEnhancer(() => ({ a: 1 })),
      loaderEnhancer(() => ({ b: 2 })),
    );

    const result = await loader({
      hono: {} as never,
      request: new Request("http://localhost/"),
      params: {},
      route: "/",
    });

    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("preserves loader function type", () => {
    const loader = composeLoader(async () => ({ ok: true }));
    expect(typeof loader).toBe("function");
  });
});

import { describe, expect, it, vi } from "vitest";
import { teeAsyncIterable } from "./sse.js";

async function ensurePumpSettled(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

describe("teeAsyncIterable", () => {
  it("cancels the source when both branches stop early", async () => {
    let sourceCleanup = 0;
    const source = {
      async *[Symbol.asyncIterator]() {
        try {
          yield 1;
          yield 2;
          yield 3;
        } finally {
          sourceCleanup += 1;
        }
      },
    };

    const [a, b] = teeAsyncIterable(source);
    const iterA = a[Symbol.asyncIterator]();
    const iterB = b[Symbol.asyncIterator]();

    expect(await iterA.next()).toEqual({ value: 1, done: false });
    expect(await iterB.next()).toEqual({ value: 1, done: false });

    await iterA.return?.();
    await iterB.return?.();
    await ensurePumpSettled();

    expect(sourceCleanup).toBe(1);
  });

  it("keeps the remaining branch alive when only one branch stops", async () => {
    const source = (async function* () {
      yield "a";
      yield "b";
    })();

    const [left, right] = teeAsyncIterable(source);
    const leftIter = left[Symbol.asyncIterator]();
    const rightIter = right[Symbol.asyncIterator]();

    expect(await leftIter.next()).toEqual({ value: "a", done: false });
    await leftIter.return?.();

    expect(await rightIter.next()).toEqual({ value: "a", done: false });
    expect(await rightIter.next()).toEqual({ value: "b", done: false });
    expect(await rightIter.next()).toEqual({ value: undefined, done: true });
  });
});

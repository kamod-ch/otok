import { describe, expect, it, vi } from "vitest";
import { MemoryIdempotencyStore } from "./memory-store.js";
import { runIdempotentAction, setIdempotencyStore, clearIdempotencyStore } from "./run.js";
import { deserializeIdempotencyResponse, serializeIdempotencyResponse } from "./serialize.js";

describe("MemoryIdempotencyStore", () => {
  it("replays completed responses for the same fingerprint", async () => {
    const store = new MemoryIdempotencyStore();
    const key = "scope|k:client-key-12345678";
    const fingerprint = "fp1";
    const stored = await serializeIdempotencyResponse(new Response("ok", { status: 201 }), false);
    expect(stored).toBeDefined();
    await store.begin(key, fingerprint, 60_000);
    await store.complete(key, fingerprint, stored!, 60_000);

    const again = await store.begin(key, fingerprint, 60_000);
    expect(again.kind).toBe("replay");
    expect(await again.response!.text()).toBe("ok");
  });

  it("returns conflict for the same client key with a different fingerprint", async () => {
    const store = new MemoryIdempotencyStore();
    const key = "scope|k:client-key-12345678";
    await store.begin(key, "a", 60_000);
    const second = await store.begin(key, "b", 60_000);
    expect(second.kind).toBe("conflict");
  });

  it("deduplicates concurrent leaders", async () => {
    vi.useFakeTimers();
    clearIdempotencyStore();
    const store = new MemoryIdempotencyStore();
    setIdempotencyStore(store);
    const key = "scope|k:client-key-12345678";
    let runs = 0;
    const factory = async () => {
      runs++;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return new Response(`run-${runs}`, { status: 200 });
    };

    const first = runIdempotentAction(key, "same", factory, store);
    const second = runIdempotentAction(key, "same", factory, store);
    await vi.advanceTimersByTimeAsync(25);
    const [a, b] = await Promise.all([first, second]);
    expect(await a.text()).toBe("run-1");
    expect(await b.text()).toBe("run-1");
    expect(runs).toBe(1);
    vi.useRealTimers();
  });
});

describe("serializeIdempotencyResponse", () => {
  it("round-trips buffered bodies", async () => {
    const stored = await serializeIdempotencyResponse(new Response("hello", { status: 200 }), false);
    expect(stored).toBeDefined();
    const replay = deserializeIdempotencyResponse(stored!);
    expect(replay.headers.get("x-otok-idempotency")).toBe("replay");
    expect(await replay.text()).toBe("hello");
  });

  it("refuses Set-Cookie responses", async () => {
    const response = new Response("x", {
      headers: { "set-cookie": "sid=1" },
    });
    expect(await serializeIdempotencyResponse(response, false)).toBeUndefined();
  });
});

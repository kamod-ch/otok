import { describe, expect, it } from "vitest";
import { DEFAULT_DURABLE_OBJECT_CONTRACT, defineDurableObjectProvider } from "./providers/durable-objects.js";

describe("public API compatibility", () => {
  it("defineDurableObjectProvider shape unchanged", () => {
    const spec = defineDurableObjectProvider({ namespaceId: "REALTIME_ROOM" });
    expect(spec.namespaceId).toBe("REALTIME_ROOM");
    expect(spec.contract.objectName("c", "r")).toBe("realtime:c:r");
    expect(spec.integrationNotes.length).toBeGreaterThan(3);
  });

  it("DEFAULT_DURABLE_OBJECT_CONTRACT serialize round-trip", () => {
    const msg = {
      id: "1",
      type: "t",
      channel: "c",
      room: "r",
      data: { ok: true },
      timestamp: new Date().toISOString(),
    };
    const raw = DEFAULT_DURABLE_OBJECT_CONTRACT.serialize(msg);
    expect(DEFAULT_DURABLE_OBJECT_CONTRACT.deserialize(raw)).toEqual(msg);
  });
});

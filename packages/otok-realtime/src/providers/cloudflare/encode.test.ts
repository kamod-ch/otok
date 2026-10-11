import { describe, expect, it } from "vitest";
import { decodeRouteSegments, objectName, routeSegments } from "./encode.js";

describe("cloudflare room encoding", () => {
  it("round-trips channel and room", () => {
    const { channelB64, roomB64 } = routeSegments("orders", "acme-1");
    expect(decodeRouteSegments(channelB64, roomB64)).toEqual({ channel: "orders", room: "acme-1" });
  });

  it("objectName uses rt/v1 prefix", () => {
    expect(objectName("a", "b")).toMatch(/^rt\/v1\//);
  });

  it("disambiguates colon boundaries via encoding", () => {
    expect(objectName("a:b", "c")).not.toBe(objectName("a", "b:c"));
  });
});

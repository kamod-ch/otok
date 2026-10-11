/** Plan 035 room encoding — safe for Node and Workers (no CF globals). */

const PREFIX = "rt/v1/";
const MAX_BYTES = 128;

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function assertSegment(name: string, value: string): void {
  if (!value) throw new Error(`${name} must be non-empty`);
  if (value.includes("\0")) throw new Error(`${name} must not contain NUL`);
  if (utf8ByteLength(value) > MAX_BYTES) throw new Error(`${name} exceeds ${MAX_BYTES} bytes`);
  if (value.includes("..")) throw new Error(`${name} must not contain ..`);
}

export function base64urlEncodeUtf8(value: string): string {
  assertSegment("segment", value);
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64urlDecodeUtf8(segment: string): string {
  if (!segment) throw new Error("invalid base64 segment");
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const decoded = new TextDecoder().decode(bytes);
  return decoded;
}

export function decodeRouteSegments(channelB64: string, roomB64: string): { channel: string; room: string } {
  const channel = base64urlDecodeUtf8(channelB64);
  const room = base64urlDecodeUtf8(roomB64);
  assertSegment("channel", channel);
  assertSegment("room", room);
  return { channel, room };
}

export function objectName(channel: string, room: string): string {
  assertSegment("channel", channel);
  assertSegment("room", room);
  return `${PREFIX}${base64urlEncodeUtf8(channel)}/${base64urlEncodeUtf8(room)}`;
}

export function routeSegments(channel: string, room: string): { channelB64: string; roomB64: string } {
  return {
    channelB64: base64urlEncodeUtf8(channel),
    roomB64: base64urlEncodeUtf8(room),
  };
}

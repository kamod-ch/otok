import type { RealtimeMessage, RealtimeError } from "../types.js";
import { isRealtimeError } from "../errors.js";

export type WsMessage =
  | { type: "subscribe"; channel: string; room: string; lastEventId?: string }
  | { type: "presence"; status: "online" | "away" | "offline"; metadata?: Record<string, unknown> }
  | { type: "ping" }
  | { type: "pong" };

export function encodeWsFrame(message: RealtimeMessage | RealtimeError): string {
  return JSON.stringify(isRealtimeError(message) ? { error: message } : { event: message });
}

export function decodeWsFrame(raw: string): WsMessage | null {
  try {
    const parsed = JSON.parse(raw) as WsMessage;
    if (parsed && typeof parsed === "object" && "type" in parsed) return parsed;
    return null;
  } catch {
    return null;
  }
}

export interface WebSocketLike {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: "message" | "close", listener: (ev: { data?: string }) => void): void;
}

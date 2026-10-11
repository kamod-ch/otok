/** Workers-safe SSE framing (no imports from Node hub graph). */

export interface CloudflareRealtimeMessage {
  id: string;
  type: string;
  channel: string;
  room: string;
  data: unknown;
  timestamp: string;
}

export interface CloudflareRealtimeError {
  code: string;
  message: string;
}

function isRealtimeError(message: unknown): message is CloudflareRealtimeError {
  return (
    typeof message === "object" &&
    message !== null &&
    "code" in message &&
    "message" in message &&
    !("channel" in message)
  );
}

export function formatSseEvent(message: CloudflareRealtimeMessage | CloudflareRealtimeError): string {
  if (isRealtimeError(message)) {
    return `event: error\ndata: ${JSON.stringify(message)}\n\n`;
  }
  return `id: ${message.id}\nevent: ${message.type}\ndata: ${JSON.stringify({
    channel: message.channel,
    room: message.room,
    data: message.data,
    timestamp: message.timestamp,
  })}\n\n`;
}

export function formatSseComment(comment: string): string {
  return `: ${comment}\n\n`;
}

export function formatGapEvent(code: "UNKNOWN_EVENT_ID" | "EVENT_EXPIRED"): string {
  return `event: gap\ndata: ${JSON.stringify({ code })}\n\n`;
}

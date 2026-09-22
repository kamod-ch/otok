import { createHash } from "node:crypto";
import { IDEMPOTENCY_MAX_BODY_BYTES, IDEMPOTENCY_MAX_FORM_FIELDS } from "./types.js";

export type BodyFingerprintKind = "empty" | "json" | "form" | "unsupported";

export interface PayloadFingerprint {
  hash: string;
  kind: BodyFingerprintKind;
}

export class IdempotencyPayloadError extends Error {
  constructor(
    message: string,
    readonly code: "PAYLOAD_TOO_LARGE" | "UNSUPPORTED_BODY" | "TOO_MANY_FIELDS",
  ) {
    super(message);
    this.name = "IdempotencyPayloadError";
  }
}

function digest(parts: string[]): string {
  const hash = createHash("sha256");
  for (const part of parts) hash.update(part);
  hash.update("\0");
  return hash.digest("hex");
}

async function readLimitedText(request: Request, limit: number): Promise<string> {
  const clone = request.clone();
  const reader = clone.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > limit) {
      throw new IdempotencyPayloadError("Request body exceeds idempotency fingerprint limit.", "PAYLOAD_TOO_LARGE");
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

function fingerprintFormData(formData: FormData): PayloadFingerprint {
  const entries: Array<[string, string]> = [];
  let fields = 0;
  for (const [key, value] of formData.entries()) {
    if (key === "_idempotency" || key === "_method" || key === "_csrf") continue;
    fields++;
    if (fields > IDEMPOTENCY_MAX_FORM_FIELDS) {
      throw new IdempotencyPayloadError("Too many form fields for idempotency fingerprint.", "TOO_MANY_FIELDS");
    }
    if (typeof value === "string") {
      entries.push([key, value]);
      continue;
    }
    entries.push([key, `file:${value.name}:${value.size}:${value.type}`]);
  }
  entries.sort(([a], [b]) => a.localeCompare(b));
  const parts = entries.map(([k, v]) => `${k}=${v}`);
  return { hash: digest(parts), kind: "form" };
}

export async function fingerprintActionPayload(
  request: Request,
  formData: FormData | undefined,
): Promise<PayloadFingerprint> {
  if (formData) return fingerprintFormData(formData);

  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD") {
    return { hash: digest([]), kind: "empty" };
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const text = await readLimitedText(request, IDEMPOTENCY_MAX_BODY_BYTES);
    return { hash: digest([text]), kind: "json" };
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await readLimitedText(request, IDEMPOTENCY_MAX_BODY_BYTES);
    const params = new URLSearchParams(text);
    const fd = new FormData();
    for (const [key, value] of params.entries()) fd.append(key, value);
    return fingerprintFormData(fd);
  }

  if (contentType.includes("multipart/form-data")) {
    throw new IdempotencyPayloadError(
      "Multipart actions must be parsed as FormData before idempotency fingerprinting.",
      "UNSUPPORTED_BODY",
    );
  }

  if (!request.body) {
    return { hash: digest([]), kind: "empty" };
  }

  const text = await readLimitedText(request, IDEMPOTENCY_MAX_BODY_BYTES);
  if (!text) return { hash: digest([]), kind: "empty" };
  return { hash: digest([text]), kind: "unsupported" };
}

import { createHmac, timingSafeEqual } from "node:crypto";
import type { OAuthProviderId } from "./adapter/types.js";

export type OAuthStatePayload = {
  provider: OAuthProviderId;
  state: string;
  codeVerifier: string | null;
  next: string | null;
  link?: boolean;
  issuedAt: number;
};

const DEFAULT_MAX_AGE_MS = 10 * 60 * 1000;

export function encodePayload(payload: string): string {
  return Buffer.from(payload, "utf8").toString("base64url");
}

export function decodePayload(encoded: string): string | null {
  try {
    return Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function signPayload(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function seal(value: string, secret: string): string {
  const encoded = encodePayload(value);
  return `${encoded}.${signPayload(encoded, secret)}`;
}

export function unseal(token: string, secret: string): string | null {
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const encoded = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!encoded || !signature) return null;

  const expected = signPayload(encoded, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  return decodePayload(encoded);
}

export function sealOAuthState(payload: OAuthStatePayload, secret: string): string {
  return seal(JSON.stringify(payload), secret);
}

export function unsealOAuthState(
  token: string,
  secret: string,
  options?: { maxAgeMs?: number; now?: number },
): OAuthStatePayload | null {
  const raw = unseal(token, secret);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isOAuthStatePayload(parsed)) return null;

  const maxAgeMs = options?.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const now = options?.now ?? Date.now();
  if (now - parsed.issuedAt > maxAgeMs) return null;

  return parsed;
}

function isOAuthStatePayload(value: unknown): value is OAuthStatePayload {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    (record.provider === "github" ||
      record.provider === "google" ||
      record.provider === "microsoft" ||
      record.provider === "gitlab") &&
    typeof record.state === "string" &&
    (typeof record.codeVerifier === "string" || record.codeVerifier === null) &&
    (typeof record.next === "string" || record.next === null) &&
    (record.link === undefined || typeof record.link === "boolean") &&
    typeof record.issuedAt === "number"
  );
}

export { DEFAULT_MAX_AGE_MS };

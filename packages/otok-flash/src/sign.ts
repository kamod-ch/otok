import { createHmac, timingSafeEqual } from "node:crypto";

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

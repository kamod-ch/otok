import { createHash, randomBytes } from "node:crypto";

function bytesToBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function sha256(value: string): string {
  if (typeof createHash === "function") {
    return createHash("sha256").update(value).digest("hex");
  }
  throw new Error("otok-auth: sha256 requires Node crypto or use sha256Async for Web Crypto");
}

/** Edge-compatible SHA-256 via Web Crypto API. */
export async function sha256Async(value: string): Promise<string> {
  if (typeof globalThis.crypto?.subtle?.digest === "function") {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return sha256(value);
}

export function randomToken(bytes = 32): string {
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return bytesToBase64Url(arr);
  }
  return randomBytes(bytes).toString("base64url");
}

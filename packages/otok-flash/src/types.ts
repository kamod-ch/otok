import type { Context } from "hono";

export type FlashType = "info" | "success" | "error" | "warning";

export type FlashMessage = {
  message: string;
  type?: FlashType;
};

export interface FlashConfig {
  secret: string;
  cookieName?: string;
  maxAgeSeconds?: number;
  secure?: boolean | ((c: Context) => boolean);
  sameSite?: "Strict" | "Lax" | "None";
  path?: string;
  contextKey?: string;
}

export interface FlashPayload extends FlashMessage {
  iat: number;
}

export const DEFAULT_FLASH_COOKIE = "otok_flash";

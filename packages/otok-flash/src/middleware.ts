import type { Context } from "hono";
import { defineMiddleware, type OtokMiddleware } from "otok/server";
import { consumeFlash } from "./flash.js";
import type { FlashConfig } from "./types.js";

export interface FlashMiddlewareOptions extends FlashConfig {
  /** When false, leaves flash on the cookie for a later loader. Default: true. */
  consume?: boolean;
  onFlash?: (c: Context, flash: NonNullable<ReturnType<typeof consumeFlash>>) => void;
}

export function createFlashMiddleware(options: FlashMiddlewareOptions): OtokMiddleware {
  const consume = options.consume ?? true;
  const contextKey = options.contextKey ?? "flash";

  return defineMiddleware(async (c, next) => {
    if (consume) {
      const flash = consumeFlash(c, options);
      if (flash) {
        c.set(contextKey, flash);
        options.onFlash?.(c, flash);
      }
    }
    await next();
  });
}

export function readFlash(c: Context, contextKey = "flash") {
  return c.get(contextKey) as ReturnType<typeof consumeFlash> | undefined;
}

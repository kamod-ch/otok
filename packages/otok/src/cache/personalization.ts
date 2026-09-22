import type { RenderContext } from "../rendering/types.js";

const AUTH_COOKIE_PREFIXES = ["session", "auth", "otok_session", "__session"];

export function isPersonalizedRequest(ctx: Pick<RenderContext, "hasAuth" | "hasSession" | "cookies">): boolean {
  if (ctx.hasAuth || ctx.hasSession) return true;
  if (!ctx.cookies) return false;
  const lower = ctx.cookies.toLowerCase();
  return AUTH_COOKIE_PREFIXES.some((prefix) => lower.includes(`${prefix}=`));
}

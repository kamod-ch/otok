import type { Context } from "hono";
import { defineMiddleware, redirect, type OtokMiddleware } from "otok/server";

export interface RequireAuthOptions<TUser> {
  getUser: (c: Context) => Promise<TUser | null>;
  loginPath?: string;
  publicPaths?: Iterable<string>;
  contextKey?: string;
  onAuthenticated?: (c: Context, user: TUser) => void;
}

export function createRequireAuthMiddleware<TUser>(
  options: RequireAuthOptions<TUser>,
): OtokMiddleware {
  const loginPath = options.loginPath ?? "/login";
  const publicPaths = new Set(options.publicPaths ?? []);
  const contextKey = options.contextKey ?? "user";

  return defineMiddleware(async (c, next) => {
    const pathname = new URL(c.req.url).pathname;
    if (publicPaths.has(pathname)) {
      await next();
      return;
    }
    const user = await options.getUser(c);
    if (!user) redirect(loginPath, 303);
    c.set(contextKey, user);
    options.onAuthenticated?.(c, user);
    await next();
  });
}

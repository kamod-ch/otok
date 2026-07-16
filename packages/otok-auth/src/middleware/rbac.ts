import type { Context } from "hono";
import { defineMiddleware, fail, redirect, type OtokMiddleware } from "otok/server";

function readUser<TUser>(c: Context, getUser?: (c: Context) => TUser | undefined): TUser | undefined {
  if (getUser) return getUser(c);
  return c.get("user") as TUser | undefined;
}

export interface SessionContextMiddlewareOptions<TUser> {
  /** Defaults to `c.get("user")`. */
  getUser?: (c: Context) => TUser | undefined;
  set: Record<string, (user: TUser) => unknown>;
}

export function createSessionContextMiddleware<TUser>(
  options: SessionContextMiddlewareOptions<TUser>,
): OtokMiddleware {
  return defineMiddleware(async (c, next) => {
    const user = readUser(c, options.getUser);
    if (!user) redirect("/login", 303);

    for (const [key, getter] of Object.entries(options.set)) {
      c.set(key, getter(user));
    }

    await next();
  });
}

export interface TenantMiddlewareOptions<TUser> {
  getUser?: (c: Context) => TUser | undefined;
  getTenantId: (user: TUser) => string;
  /** Defaults to `tenantId`. Use `organizationId`, `workspaceId`, etc. */
  contextKey?: string;
  also?: Record<string, (user: TUser) => unknown>;
}

export function createTenantMiddleware<TUser>(
  options: TenantMiddlewareOptions<TUser>,
): OtokMiddleware {
  const contextKey = options.contextKey ?? "tenantId";
  return createSessionContextMiddleware<TUser>({
    getUser: options.getUser,
    set: {
      [contextKey]: options.getTenantId,
      ...options.also,
    },
  });
}

export interface RequireRoleMiddlewareOptions<TUser, TRole extends string = string> {
  getUser?: (c: Context) => TUser | undefined;
  getRole: (user: TUser) => TRole;
  allowed: readonly TRole[];
  loginPath?: string;
  message?: string;
}

export function createRequireRoleMiddleware<TUser, TRole extends string = string>(
  options: RequireRoleMiddlewareOptions<TUser, TRole>,
): OtokMiddleware {
  const loginPath = options.loginPath ?? "/login";
  const message = options.message ?? "Insufficient permissions";

  return defineMiddleware(async (c, next) => {
    const user = readUser(c, options.getUser);
    if (!user) redirect(loginPath, 303);

    const role = options.getRole(user);
    if (!options.allowed.includes(role)) {
      fail(403, { formErrors: [message] });
    }

    await next();
  });
}

export function composeMiddleware(...middlewares: OtokMiddleware[]): OtokMiddleware {
  return defineMiddleware(async (c, next) => {
    async function dispatch(index: number): Promise<Response | undefined> {
      const middleware = middlewares[index];
      if (!middleware) {
        await next();
        return undefined;
      }

      let downstream: Response | undefined;
      const result = await middleware(c, async () => {
        downstream = await dispatch(index + 1);
      });

      if (result instanceof Response) return result;
      return downstream;
    }

    const response = await dispatch(0);
    if (response instanceof Response) return response;
  });
}

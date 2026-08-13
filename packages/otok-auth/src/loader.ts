import type { LoaderResult, OtokActionContext, OtokContext, OtokLoader } from "@kamod-ch/otok/server";
import type { AuthBoundHelpers } from "./context.js";
import { authFromOtokContext } from "./context.js";
import { tryGetAuthRuntime } from "./registry.js";
import type { AuthUser } from "./types.js";

type LoaderAuthContext<TUser extends AuthUser = AuthUser> = {
  auth: AuthBoundHelpers<TUser>;
};

type ActionAuthContext<TUser extends AuthUser = AuthUser> = LoaderAuthContext<TUser>;

function resolveAuth<TUser extends AuthUser>(hono: OtokContext["hono"]): AuthBoundHelpers<TUser> {
  const runtime = tryGetAuthRuntime<TUser>();
  if (!runtime) {
    throw new Error(
      "otok-auth: defineLoader requires auth() plugin or registerAuthRuntime(). " +
        "Use loader: ({ hono }) => ... with getSession(hono) for manual wiring.",
    );
  }
  return authFromOtokContext(hono, runtime.helpers);
}

/**
 * Wrap a loader with typed `auth` helpers from the registered otok-auth runtime.
 *
 * ```ts
 * export const loader = defineLoader(async ({ auth }) => {
 *   const user = await auth.requireUser();
 *   return { user };
 * });
 * ```
 */
export function defineLoader<Data extends LoaderResult>(
  handler: (ctx: OtokContext & LoaderAuthContext) => Data | Promise<Data>,
): OtokLoader<Data> {
  return (context) => handler({ ...context, auth: resolveAuth(context.hono) });
}

/**
 * Wrap an action with typed `auth` helpers from the registered otok-auth runtime.
 */
export function defineAction<Result>(
  handler: (ctx: OtokActionContext & ActionAuthContext) => Result | Promise<Result>,
): (context: OtokActionContext) => Result | Promise<Result> {
  return (context) => handler({ ...context, auth: resolveAuth(context.hono) });
}

import type { Context } from "hono";
import { resolveOtokCacheScope } from "../../cache/scope.js";
import type { OtokRoute } from "../../shared/routes.js";
import type { ActionMethod } from "../action-method.js";
import type { IdempotencyScope } from "./types.js";

export function buildIdempotencyScope(
  c: Context,
  route: Pick<OtokRoute, "id" | "path">,
  method: ActionMethod,
): IdempotencyScope {
  const verified = resolveOtokCacheScope(c);
  const userId = verified?.userId;
  const tenantId = verified?.tenantId;

  let anonymousBucket = "anon";
  if (tenantId && !userId) anonymousBucket = `tenant:${tenantId}`;

  return {
    routeId: route.id,
    routePath: route.path,
    method,
    userId,
    tenantId,
    anonymousBucket,
  };
}

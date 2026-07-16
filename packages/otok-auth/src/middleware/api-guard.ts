import type { Context } from "hono";

export function createApiGuard<TUser>(
  getUser: (c: Context) => Promise<TUser | null>,
): (c: Context) => Promise<TUser | null> {
  return (c) => getUser(c);
}

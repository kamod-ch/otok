import { createRequireAuthMiddleware } from "@kamod-ch/otok-auth/middleware";
import { getAuthRuntime } from "@kamod-ch/otok-auth/registry";

export default createRequireAuthMiddleware({
  getUser: (c) => getAuthRuntime().helpers.getSession(c),
  loginPath: "/login",
});

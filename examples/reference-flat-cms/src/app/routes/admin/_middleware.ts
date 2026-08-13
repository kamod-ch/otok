import { defineMiddleware } from "@kamod-ch/otok/server";

export default defineMiddleware(async (c, next) => {
  const token = c.req.header("x-admin-token") ?? "demo";
  c.set("admin", { name: "Demo editor", token });
  await next();
});

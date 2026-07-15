import { defineMiddleware, redirect } from "otok/server";

export default defineMiddleware(async (c, next) => {
  if (c.req.query("demoUser") !== "1") redirect("/projects", 303);
  c.set("demoUser", "Demo User");
  await next();
});

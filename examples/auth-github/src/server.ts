import { createOtokApp } from "otok/server";

export default createOtokApp({
  configure: async (app) => {
    const { applyAppPlugins } = await import("virtual:otok-config");
    await applyAppPlugins(app);
  },
});

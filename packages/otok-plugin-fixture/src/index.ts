import type { Plugin } from "vite";
import { definePlugin } from "otok";
import { readFixtureHookLog, recordFixtureHook, resetFixtureHookLog } from "./hooks.js";

export interface FixturePluginOptions {
  prefix?: string;
}

export default definePlugin<FixturePluginOptions>({
  name: "otok-plugin-fixture",
  version: "0.1.0",
  schema: {
    parse(input) {
      if (input !== undefined && typeof input !== "object") {
        throw new Error("options must be an object");
      }
      return input ?? {};
    },
  },
  config(options) {
    recordFixtureHook("config");
    return {
      theme: true,
      env: {
        FIXTURE_PREFIX: options?.prefix ?? "fixture",
      },
    };
  },
  configResolved() {
    recordFixtureHook("configResolved");
  },
  buildStart() {
    recordFixtureHook("buildStart");
  },
  buildEnd() {
    recordFixtureHook("buildEnd");
  },
  configureServer() {
    recordFixtureHook("configureServer");
  },
  configureApp({ app }) {
    recordFixtureHook("configureApp");
    app.get("/api/plugin/fixture", (c) =>
      c.json({
        ok: true,
        hooks: readFixtureHookLog(),
      }),
    );
  },
  configureVite() {
    recordFixtureHook("configureVite");
    const marker: Plugin = {
      name: "otok-plugin-fixture:vite-marker",
    };
    return marker;
  },
  virtualModules: {
    meta: () => 'export const fixture = "ok";',
  },
  envSchema: {
    parse(input) {
      return {
        fixturePrefix: input.FIXTURE_PREFIX ?? "fixture",
      };
    },
  },
});

export { readFixtureHookLog, recordFixtureHook, resetFixtureHookLog };

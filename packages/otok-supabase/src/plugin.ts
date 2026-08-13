import { definePlugin } from "@kamod-ch/otok";
import type { Hono } from "hono";
import { validateSupabaseConfig } from "./config.js";
import { SupabaseConfigurationError } from "./errors.js";
import { createSupabaseAuthRoutes } from "./auth/routes.js";
import { registerSupabaseRuntime } from "./registry.js";
import { supabase } from "./server/middleware.js";
import type { SupabasePluginOptions, SupabaseRuntime } from "./types.js";

const DEFAULT_AUTH_ROUTES = {
  successRedirect: "/dashboard",
  errorRedirect: "/login",
  redirectAllowlist: ["/"] as const,
};

export function configureSupabaseApp(app: Hono, options: SupabasePluginOptions): SupabaseRuntime {
  const config = validateSupabaseConfig(options);
  const mountAuthRoutes = options.mountAuthRoutes !== false;
  const authRoutes = {
    ...DEFAULT_AUTH_ROUTES,
    ...options.authRoutes,
  };

  const runtime: SupabaseRuntime = {
    config,
    authRoutes,
    mountAuthRoutes,
  };

  registerSupabaseRuntime(runtime);

  app.use("*", supabase(config));

  if (mountAuthRoutes) {
    createSupabaseAuthRoutes(authRoutes).mount(app);
  }

  return runtime;
}

const supabasePluginFactory = definePlugin<SupabasePluginOptions>({
  name: "@kamod-ch/otok-supabase",
  version: "1.0.0",
  schema: {
    parse(input) {
      if (!input || typeof input !== "object") {
        throw new SupabaseConfigurationError("supabase() options must be an object.");
      }
      validateSupabaseConfig(input as SupabasePluginOptions);
      return input as SupabasePluginOptions;
    },
  },
  envSchema: {
    parse(input) {
      const url = input.SUPABASE_URL?.trim();
      const publishableKey = input.SUPABASE_PUBLISHABLE_KEY?.trim();
      if (url !== undefined && !url) {
        throw new SupabaseConfigurationError("SUPABASE_URL must not be empty when set.");
      }
      if (publishableKey !== undefined && !publishableKey) {
        throw new SupabaseConfigurationError("SUPABASE_PUBLISHABLE_KEY must not be empty when set.");
      }
      return { supabaseUrl: url, supabasePublishableKey: publishableKey };
    },
  },
});

/** Otok plugin factory — register in otok.config.ts plugins array. */
export default function supabasePlugin(options: SupabasePluginOptions) {
  const plugin = supabasePluginFactory(options);
  plugin.configureApp = ({ app }) => {
    configureSupabaseApp(app, options);
  };
  return plugin;
}

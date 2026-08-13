import { definePlugin } from "@kamod-ch/otok";
import { getAuthRuntime, tryGetAuthRuntime } from "@kamod-ch/otok-auth/registry";
import type { OAuthAdapter } from "./adapter/types.js";
import { createOAuthFlow, type OAuthFlowOptions } from "./flow.js";
import type { OAuthProviderConfig } from "./providers/types.js";
import type { OAuthProviderId } from "./adapter/types.js";

export interface OAuthPluginOptions<TUser = unknown> {
  secret?: string;
  adapter: OAuthAdapter<TUser>;
  providers: Partial<Record<OAuthProviderId, OAuthProviderConfig>>;
  basePath?: string;
  loginPath?: string;
  redirectAllowlist?: readonly string[];
  secure?: OAuthFlowOptions<TUser>["secure"];
  onSuccess?: OAuthFlowOptions<TUser>["onSuccess"];
  onError?: OAuthFlowOptions<TUser>["onError"];
  tokenRefresh?: OAuthFlowOptions<TUser>["tokenRefresh"];
}

function resolveSecret(options: Pick<OAuthPluginOptions, "secret">): string {
  const secret = options.secret ?? process.env.AUTH_SECRET ?? process.env.OAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("otok-oauth: provide secret (min 32 bytes) or set AUTH_SECRET");
  }
  return secret;
}

function buildFlowOptions<TUser>(options: OAuthPluginOptions<TUser>): OAuthFlowOptions<TUser> {
  const authRuntime = tryGetAuthRuntime();
  return {
    secret: resolveSecret(options),
    adapter: options.adapter,
    createSession: async (c, userId) => {
      const runtime = getAuthRuntime();
      await runtime.sessions.createSession(c, userId);
    },
    providers: options.providers,
    basePath: options.basePath,
    loginPath: options.loginPath ?? authRuntime?.loginPath,
    redirectAllowlist: options.redirectAllowlist ?? authRuntime?.redirectAllowlist,
    secure: options.secure,
    onSuccess: options.onSuccess,
    onError: options.onError,
    tokenRefresh: options.tokenRefresh,
  };
}

const oauthPluginFactory = definePlugin<OAuthPluginOptions>({
  name: "@kamod-ch/otok-oauth",
  version: "1.1.0",
  schema: {
    parse(input) {
      if (!input || typeof input !== "object") {
        throw new Error("oauth() options must be an object");
      }
      const record = input as Record<string, unknown>;
      if (!record.adapter || typeof record.adapter !== "object") {
        throw new Error("oauth() requires an OAuthAdapter");
      }
      if (!record.providers || typeof record.providers !== "object") {
        throw new Error("oauth() requires providers");
      }
      return input as OAuthPluginOptions;
    },
  },
});

/** Otok plugin factory — register after auth() in otok.config.ts. */
export default function oauth<TUser = unknown>(options: OAuthPluginOptions<TUser>) {
  const plugin = oauthPluginFactory(options as OAuthPluginOptions);
  const flow = createOAuthFlow(buildFlowOptions(options));
  plugin.configureApp = ({ app }) => {
    flow.mount(app);
  };
  return plugin;
}

/** Programmatic setup — backward compatible with createOAuthFlow(). */
export { createOAuthFlow };

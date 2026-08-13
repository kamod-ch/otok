import { definePlugin } from "@kamod-ch/otok";
import type { Hono } from "hono";
import type { AiPluginOptions, AiRuntime } from "./types.js";
import { OtokAiConfigError } from "./errors.js";
import { createAiProvider } from "./providers/factory.js";
import { createMemoryBudgetStore } from "./budget/memory-store.js";
import { createMemoryConversationStore } from "./conversation/memory-store.js";
import { AiClient } from "./client/ai-client.js";
import { registerAiRuntime } from "./registry.js";
import { createAiRateLimiter, resolveAiRateLimitKey } from "./rate-limit/ai-rate-limit.js";
import { OtokAiRateLimitError } from "./errors.js";
import { mountMcpRoutes } from "./mcp/server.js";
import { generateLlmsTxt } from "./llms/generate.js";

export async function configureAiApp(app: Hono, options: AiPluginOptions): Promise<AiRuntime> {
  const provider = createAiProvider(options.provider);
  const defaultModel =
    options.defaultModel ??
    (options.provider.type === "openai" ? options.provider.defaultModel : undefined) ??
    "gpt-4o-mini";

  const budgetStore = options.budgetStore ?? createMemoryBudgetStore();
  const conversationStore = options.conversationStore ?? createMemoryConversationStore();
  const rateLimiter = options.rateLimit ? createAiRateLimiter(options.rateLimit) : null;

  const client = new AiClient({
    provider,
    defaultModel,
    budgetStore,
    redact: options.redact ?? true,
    timeoutMs: options.timeoutMs,
    retries: options.retries,
    onAudit: (entry) => {
      if (process.env.NODE_ENV !== "test") {
        // eslint-disable-next-line no-console
        console.debug("[otok-ai:audit]", entry.action, entry.model, entry.usage?.totalTokens);
      }
    },
  });

  const runtime: AiRuntime = {
    client,
    provider,
    defaultModel,
    budgetStore,
    conversationStore,
    redact: options.redact ?? true,
    mcpRoutes: options.mcpRoutes ?? [],
    mcpPath: options.mcpPath ?? "/api/mcp",
    llmsPath: options.llmsPath ?? "/llms.txt",
  };

  registerAiRuntime(runtime);

  if (rateLimiter) {
    app.use("/api/ai/*", async (c, next) => {
      const user = c.get("user" as never) as { id?: string } | undefined;
      const key = resolveAiRateLimitKey(options, user?.id, c.req.header("x-forwarded-for") ?? "local");
      const result = rateLimiter.check(key);
      if (!result.allowed) {
        throw new OtokAiRateLimitError("AI rate limit exceeded", result.resetAt - Date.now());
      }
      c.header("x-ratelimit-remaining", String(result.remaining));
      await next();
    });
  }

  app.get(runtime.llmsPath, async (c) => {
    const body = await generateLlmsTxt({ root: process.cwd() });
    c.header("content-type", "text/plain; charset=utf-8");
    return c.body(body);
  });

  mountMcpRoutes(app, {
    path: runtime.mcpPath,
    allowedRoutes: runtime.mcpRoutes,
    fetchImpl: (path, init) => Promise.resolve(app.request(path, init)),
  });

  return runtime;
}

const aiPluginFactory = definePlugin<AiPluginOptions>({
  name: "@kamod-ch/otok-ai",
  version: "0.1.0",
  schema: {
    parse(input) {
      if (!input || typeof input !== "object") {
        throw new OtokAiConfigError("ai() options must be an object");
      }
      const record = input as Record<string, unknown>;
      if (!record.provider || typeof record.provider !== "object") {
        throw new OtokAiConfigError("ai() requires provider configuration");
      }
      return input as AiPluginOptions;
    },
  },
  envSchema: {
    parse(input) {
      return { openaiApiKey: input.OPENAI_API_KEY };
    },
  },
});

export default function ai(options: AiPluginOptions) {
  const plugin = aiPluginFactory(options);
  plugin.configureApp = async ({ app }) => {
    await configureAiApp(app, options);
  };
  return plugin;
}

export type { AiPluginOptions };

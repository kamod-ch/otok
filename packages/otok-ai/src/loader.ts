import type { OtokActionContext, OtokContext, OtokLoader } from "@kamod-ch/otok/server";
import type { LoaderResult } from "@kamod-ch/otok/server";
import { getAiClient, tryGetAiRuntime } from "./registry.js";
import type { AiClient } from "./client/ai-client.js";

type AiContext = { ai: AiClient };

function resolveAi(): AiClient {
  const runtime = tryGetAiRuntime();
  if (!runtime) {
    throw new Error(
      "otok-ai: defineAiAction requires ai() plugin. Add ai() to otok.config.ts plugins.",
    );
  }
  return runtime.client;
}

/**
 * Wrap a loader with typed `ai` client from the registered otok-ai runtime.
 */
export function defineAiLoader<Data extends LoaderResult>(
  handler: (ctx: OtokContext & AiContext) => Data | Promise<Data>,
): OtokLoader<Data> {
  return (context) => handler({ ...context, ai: resolveAi() });
}

/**
 * Wrap an action with typed `ai` client from the registered otok-ai runtime.
 *
 * ```ts
 * export const action = defineAiAction(async ({ ai, input, hono }) => {
 *   return ai.stream({ model: "configured-default", messages: input.messages });
 * });
 * ```
 */
export function defineAiAction<Result>(
  handler: (ctx: OtokActionContext & AiContext) => Result | Promise<Result>,
): (context: OtokActionContext) => Result | Promise<Result> {
  return (context) => handler({ ...context, ai: resolveAi() });
}

export { getAiClient, tryGetAiRuntime };

import type {
  AiCompletionResult,
  AiEmbedOptions,
  AiEmbedResult,
  AiProvider,
  AiProviderCapabilities,
  AiProviderChatOptions,
  AiStreamEvent,
  AiToolMap,
  OpenAiProviderConfig,
} from "../types.js";
import { OtokAiAbortedError, OtokAiProviderError } from "../errors.js";

function toolsToOpenAi(tools?: AiToolMap) {
  if (!tools) return undefined;
  return Object.values(tools).map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: { type: "object", properties: {}, additionalProperties: true },
    },
  }));
}

function messagesToOpenAi(messages: AiProviderChatOptions["messages"]) {
  return messages.map((m) => {
    if (m.role === "tool") {
      return { role: "tool" as const, tool_call_id: m.toolCallId, content: m.content };
    }
    return { role: m.role, content: m.content };
  });
}

function estimateCost(
  usage: { prompt_tokens: number; completion_tokens: number },
  config: OpenAiProviderConfig,
): number {
  const promptRate = (config.promptCostPer1M ?? 0.15) / 1_000_000;
  const completionRate = (config.completionCostPer1M ?? 0.6) / 1_000_000;
  return usage.prompt_tokens * promptRate + usage.completion_tokens * completionRate;
}

const capabilities: AiProviderCapabilities = {
  streaming: true,
  tools: true,
  structuredOutput: true,
  embeddings: true,
};

export function createOpenAiProvider(config: OpenAiProviderConfig): AiProvider {
  const apiKey = config.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("openai provider requires apiKey or OPENAI_API_KEY");
  }
  const baseUrl = (config.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const defaultModel = config.defaultModel ?? "gpt-4o-mini";
  const embeddingModel = config.embeddingModel ?? "text-embedding-3-small";

  async function fetchJson(path: string, body: unknown, signal?: AbortSignal) {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new OtokAiProviderError("openai", text || res.statusText, res.status);
    }
    return res.json() as Promise<Record<string, unknown>>;
  }

  return {
    id: "openai",
    capabilities,
    async *stream(options) {
      if (options.signal?.aborted) throw new OtokAiAbortedError();
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: options.model || defaultModel,
          messages: messagesToOpenAi(options.messages),
          tools: toolsToOpenAi(options.tools),
          stream: true,
          stream_options: { include_usage: true },
          ...(options.jsonSchema
            ? { response_format: { type: "json_object" } }
            : {}),
        }),
        signal: options.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new OtokAiProviderError("openai", text || res.statusText, res.status);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          if (options.signal?.aborted) throw new OtokAiAbortedError();
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") {
              yield { type: "done", finishReason: "stop" } satisfies AiStreamEvent;
              continue;
            }
            try {
              const chunk = JSON.parse(data) as Record<string, unknown>;
              const choices = chunk.choices as Array<Record<string, unknown>> | undefined;
              const delta = choices?.[0]?.delta as Record<string, unknown> | undefined;
              if (typeof delta?.content === "string" && delta.content) {
                yield { type: "text-delta", delta: delta.content };
              }
              const toolCalls = delta?.tool_calls as Array<Record<string, unknown>> | undefined;
              if (toolCalls?.[0]) {
                const fn = toolCalls[0].function as Record<string, unknown> | undefined;
                yield {
                  type: "tool-call",
                  call: {
                    id: String(toolCalls[0].id ?? crypto.randomUUID()),
                    name: String(fn?.name ?? ""),
                    arguments: fn?.arguments ? JSON.parse(String(fn.arguments)) : {},
                  },
                };
              }
              const usage = chunk.usage as Record<string, number> | undefined;
              if (usage?.total_tokens) {
                yield {
                  type: "usage",
                  usage: {
                    promptTokens: usage.prompt_tokens ?? 0,
                    completionTokens: usage.completion_tokens ?? 0,
                    totalTokens: usage.total_tokens ?? 0,
                    estimatedCostUsd: estimateCost(
                      { prompt_tokens: usage.prompt_tokens ?? 0, completion_tokens: usage.completion_tokens ?? 0 },
                      config,
                    ),
                  },
                };
              }
            } catch {
              // skip malformed SSE chunks
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
    async complete(options): Promise<AiCompletionResult> {
      const data = await fetchJson(
        "/chat/completions",
        {
          model: options.model || defaultModel,
          messages: messagesToOpenAi(options.messages),
          tools: toolsToOpenAi(options.tools),
          ...(options.jsonSchema ? { response_format: { type: "json_object" } } : {}),
        },
        options.signal,
      );
      const choice = (data.choices as Array<Record<string, unknown>>)?.[0];
      const message = choice?.message as Record<string, unknown> | undefined;
      const usageRaw = data.usage as Record<string, number> | undefined;
      const usage = {
        promptTokens: usageRaw?.prompt_tokens ?? 0,
        completionTokens: usageRaw?.completion_tokens ?? 0,
        totalTokens: usageRaw?.total_tokens ?? 0,
        estimatedCostUsd: usageRaw
          ? estimateCost(
              { prompt_tokens: usageRaw.prompt_tokens ?? 0, completion_tokens: usageRaw.completion_tokens ?? 0 },
              config,
            )
          : 0,
      };
      const toolCallsRaw = message?.tool_calls as Array<Record<string, unknown>> | undefined;
      const toolCalls = toolCallsRaw?.map((tc) => {
        const fn = tc.function as Record<string, unknown>;
        return {
          id: String(tc.id),
          name: String(fn.name),
          arguments: fn.arguments ? JSON.parse(String(fn.arguments)) : {},
        };
      });
      return {
        text: String(message?.content ?? ""),
        toolCalls,
        usage,
        finishReason: String(choice?.finish_reason ?? "stop"),
      };
    },
    async embed(options: AiEmbedOptions): Promise<AiEmbedResult> {
      const data = await fetchJson(
        "/embeddings",
        {
          model: options.model ?? embeddingModel,
          input: options.input,
        },
        options.signal,
      );
      const items = data.data as Array<{ embedding: number[] }>;
      const usageRaw = data.usage as Record<string, number> | undefined;
      return {
        embeddings: items.map((i) => i.embedding),
        model: String(data.model ?? embeddingModel),
        usage: {
          promptTokens: usageRaw?.prompt_tokens ?? 0,
          completionTokens: 0,
          totalTokens: usageRaw?.total_tokens ?? 0,
        },
      };
    },
  };
}

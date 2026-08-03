import type {
  AiCompletionResult,
  AiEmbedOptions,
  AiEmbedResult,
  AiProvider,
  AiProviderCapabilities,
  AiProviderChatOptions,
  AiStreamEvent,
  AiToolCall,
  AiUsage,
} from "../types.js";
import { OtokAiAbortedError } from "../errors.js";

export interface TestProviderOptions {
  responses?: Record<string, string>;
  defaultResponse?: string;
  toolCalls?: AiToolCall[];
  delayMs?: number;
}

let testState: TestProviderOptions = {};

export function configureTestProvider(options: TestProviderOptions): void {
  testState = { ...options };
}

export function resetTestProvider(): void {
  testState = {};
}

function usage(prompt: number, completion: number): AiUsage {
  return { promptTokens: prompt, completionTokens: completion, totalTokens: prompt + completion, estimatedCostUsd: 0 };
}

function lastUserContent(messages: AiProviderChatOptions["messages"]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.role === "user" && "content" in m) return m.content;
  }
  return "";
}

function resolveResponse(input: string): string {
  if (testState.responses?.[input]) return testState.responses[input];
  for (const [key, value] of Object.entries(testState.responses ?? {})) {
    if (input.includes(key)) return value;
  }
  return testState.defaultResponse ?? `Test response to: ${input.slice(0, 80)}`;
}

async function maybeDelay(signal?: AbortSignal): Promise<void> {
  if (!testState.delayMs) return;
  if (signal?.aborted) throw new OtokAiAbortedError();
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, testState.delayMs);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new OtokAiAbortedError());
    }, { once: true });
  });
}

const capabilities: AiProviderCapabilities = {
  streaming: true,
  tools: true,
  structuredOutput: true,
  embeddings: true,
};

export function createTestProvider(): AiProvider {
  return {
    id: "test",
    capabilities,
    async *stream(options) {
      await maybeDelay(options.signal);
      if (options.signal?.aborted) throw new OtokAiAbortedError();

      const input = lastUserContent(options.messages);
      const toolCalls = testState.toolCalls ?? [];

      if (toolCalls.length > 0 && options.tools) {
        for (const call of toolCalls) {
          yield { type: "tool-call", call };
        }
        yield { type: "usage", usage: usage(10, 5) };
        yield { type: "done", finishReason: "tool_calls" };
        return;
      }

      const text = resolveResponse(input);
      const chunks = text.match(/.{1,8}/g) ?? [text];
      for (const chunk of chunks) {
        if (options.signal?.aborted) throw new OtokAiAbortedError();
        yield { type: "text-delta", delta: chunk };
        await maybeDelay(options.signal);
      }
      yield { type: "usage", usage: usage(input.length, text.length) };
      yield { type: "done", finishReason: "stop" };
    },
    async complete(options) {
      await maybeDelay(options.signal);
      if (options.signal?.aborted) throw new OtokAiAbortedError();
      const input = lastUserContent(options.messages);
      const toolCalls = testState.toolCalls ?? [];
      if (toolCalls.length > 0 && options.tools) {
        return {
          text: "",
          toolCalls,
          usage: usage(10, 5),
          finishReason: "tool_calls",
        };
      }
      const text = options.jsonSchema ? JSON.stringify({ ok: true, echo: input }) : resolveResponse(input);
      return { text, usage: usage(input.length, text.length), finishReason: "stop" };
    },
    async embed(options: AiEmbedOptions): Promise<AiEmbedResult> {
      const inputs = Array.isArray(options.input) ? options.input : [options.input];
      const embeddings = inputs.map((text) =>
        text.split("").slice(0, 8).map((c) => c.charCodeAt(0) / 256),
      );
      return {
        embeddings,
        model: options.model ?? "test-embed",
        usage: usage(inputs.join("").length, 0),
      };
    },
  };
}

export { createTestProvider as createTestAiProvider };

import type {
  AiAgentOptions,
  AiBudgetStore,
  AiMessage,
  AiProvider,
  AiStreamEvent,
  AiStreamOptions,
  AiStreamResult,
  AiStructuredOptions,
  AiToolContext,
  AiToolMap,
  AiUsage,
} from "../types.js";
import {
  OtokAiAbortedError,
  OtokAiProviderError,
  OtokAiRateLimitError,
  OtokAiTimeoutError,
} from "../errors.js";
import { redactMessages, redactText } from "../redaction/redact.js";
import { parseStructuredOutputAsync, schemaToJsonSchema, validateSchema } from "../schema/validate.js";
import { aiSseResponse, aiStreamToSse, collectStreamEvents, teeAsyncIterable } from "../stream/sse.js";

export interface AiClientOptions {
  provider: AiProvider;
  defaultModel: string;
  budgetStore: AiBudgetStore;
  redact?: boolean;
  timeoutMs?: number;
  retries?: number;
  onUsage?: (usage: AiUsage, meta: { userId?: string; orgId?: string; model: string }) => void;
  onAudit?: (entry: AiAuditEntry) => void;
}

export interface AiAuditEntry {
  action: string;
  userId?: string;
  orgId?: string;
  model: string;
  usage?: AiUsage;
  redactedPrompt?: string;
  redactedOutput?: string;
}

export class AiClient {
  readonly provider: AiProvider;
  private readonly defaultModel: string;
  private readonly budgetStore: AiBudgetStore;
  private readonly redact: boolean;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly onUsage?: AiClientOptions["onUsage"];
  private readonly onAudit?: AiClientOptions["onAudit"];

  constructor(options: AiClientOptions) {
    this.provider = options.provider;
    this.defaultModel = options.defaultModel;
    this.budgetStore = options.budgetStore;
    this.redact = options.redact ?? true;
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.retries = options.retries ?? 2;
    this.onUsage = options.onUsage;
    this.onAudit = options.onAudit;
  }

  stream(options: AiStreamOptions): AiStreamResult {
    const abortController = new AbortController();
    const signal = this.mergeSignals(options.signal, abortController.signal);
    const model = options.model ?? this.defaultModel;

    let budgetChecked = false;
    const ensureBudget = async () => {
      if (!budgetChecked && options.budget) {
        await this.budgetStore.check(options.budget);
        budgetChecked = true;
      }
    };

    const run = async function* (this: AiClient): AsyncIterable<AiStreamEvent> {
      await ensureBudget();
      const messages = this.redact ? redactMessages(options.messages) : options.messages;
      let usage: AiUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

      const events = await this.withRetry(async () => {
        return this.withTimeout(signal, options.timeoutMs ?? this.timeoutMs, async (sig) =>
          this.runToolLoop({
            model,
            messages,
            tools: options.tools,
            signal: sig,
            maxRounds: options.maxToolRounds ?? 5,
            budget: options.budget,
          }),
        );
      });

      for await (const event of events) {
        if (event.type === "usage") usage = event.usage;
        yield event;
      }

      if (options.budget) await this.budgetStore.record(options.budget, usage);
      this.onUsage?.(usage, { userId: options.budget?.userId, orgId: options.budget?.orgId, model });
      this.onAudit?.({
        action: "ai.stream",
        userId: options.budget?.userId,
        orgId: options.budget?.orgId,
        model,
        usage,
        redactedPrompt: this.redact ? JSON.stringify(redactMessages(options.messages)) : undefined,
      });
    }.bind(this);

    let resolveUsage!: (u: AiUsage) => void;
    let rejectUsage!: (error: unknown) => void;
    const usagePromise = new Promise<AiUsage>((resolve, reject) => {
      resolveUsage = resolve;
      rejectUsage = reject;
    });

    const wrapped = async function* () {
      try {
        await ensureBudget();
        let usage: AiUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
        for await (const event of run()) {
          if (event.type === "usage") usage = event.usage;
          yield event;
        }
        resolveUsage(usage);
      } catch (error) {
        rejectUsage(error);
        throw error;
      }
    };

    const events = wrapped();
    const [eventsForSse, eventsForCaller] = teeAsyncIterable(events);
    void ensureBudget().catch((error) => rejectUsage(error));
    return {
      response: aiSseResponse(aiStreamToSse(eventsForSse)),
      events: eventsForCaller,
      usage: usagePromise,
      abort: () => abortController.abort(),
    };
  }

  async structured<T>(options: AiStructuredOptions<T>): Promise<{ data: T; usage: AiUsage; raw: string }> {
    const model = options.model ?? this.defaultModel;
    if (options.budget) await this.budgetStore.check(options.budget);
    const messages = this.redact ? redactMessages(options.messages) : options.messages;

    const result = await this.withRetry(() =>
      this.withTimeout(
        options.signal,
        options.timeoutMs ?? this.timeoutMs,
        async (signal) =>
          this.provider.complete({
            model,
            messages,
            signal,
            jsonSchema: schemaToJsonSchema(options.schema),
          }),
      ),
    );

    const data = await parseStructuredOutputAsync(result.text, options.schema);
    if (options.budget) await this.budgetStore.record(options.budget, result.usage);
    this.onUsage?.(result.usage, { userId: options.budget?.userId, orgId: options.budget?.orgId, model });
    this.onAudit?.({
      action: "ai.structured",
      userId: options.budget?.userId,
      orgId: options.budget?.orgId,
      model,
      usage: result.usage,
      redactedOutput: this.redact ? redactText(result.text) : undefined,
    });
    return { data, usage: result.usage, raw: result.text };
  }

  async agent(options: AiAgentOptions): Promise<{ text: string; usage: AiUsage; steps: number }> {
    const messages: AiMessage[] = options.system
      ? [{ role: "system", content: options.system }, ...options.messages]
      : [...options.messages];
    const maxSteps = options.maxSteps ?? 10;
    let totalUsage: AiUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let text = "";
    let steps = 0;

    for (let step = 0; step < maxSteps; step += 1) {
      steps += 1;
      const collected = await collectStreamEvents(
        this.provider.stream({
          model: options.model ?? this.defaultModel,
          messages,
          tools: options.tools,
          signal: options.signal,
        }),
      );
      text = collected.text;
      if (collected.usage) {
        totalUsage = {
          promptTokens: totalUsage.promptTokens + collected.usage.usage.promptTokens,
          completionTokens: totalUsage.completionTokens + collected.usage.usage.completionTokens,
          totalTokens: totalUsage.totalTokens + collected.usage.usage.totalTokens,
          estimatedCostUsd:
            (totalUsage.estimatedCostUsd ?? 0) + (collected.usage.usage.estimatedCostUsd ?? 0),
        };
      }

      const toolCalls = collected.events.filter((e) => e.type === "tool-call");
      if (toolCalls.length === 0 || !options.tools) break;

      messages.push({ role: "assistant", content: text || "" });
      for (const event of toolCalls) {
        if (event.type !== "tool-call") continue;
        const tool = options.tools[event.call.name];
        if (!tool) continue;
        const input = await validateSchema(tool.parameters, event.call.arguments);
        const ctx: AiToolContext = {
          userId: options.budget?.userId,
          orgId: options.budget?.orgId,
          signal: options.signal,
        };
        const output = await tool.execute(input, ctx);
        messages.push({
          role: "tool",
          toolCallId: event.call.id,
          content: JSON.stringify(output),
        });
      }
    }

    if (options.budget) await this.budgetStore.record(options.budget, totalUsage);
    return { text, usage: totalUsage, steps };
  }

  async embed(input: string | string[], options?: { model?: string; signal?: AbortSignal }) {
    return this.provider.embed({
      input,
      model: options?.model,
      signal: options?.signal,
    });
  }

  private async *runToolLoop(input: {
    model: string;
    messages: AiMessage[];
    tools?: AiToolMap;
    signal: AbortSignal;
    maxRounds: number;
    budget?: AiStreamOptions["budget"];
  }): AsyncIterable<AiStreamEvent> {
    const messages = [...input.messages];
    for (let round = 0; round < input.maxRounds; round += 1) {
      const pendingCalls: Array<{ type: "tool-call"; call: { id: string; name: string; arguments: unknown } }> = [];
      for await (const event of this.provider.stream({
        model: input.model,
        messages,
        tools: input.tools,
        signal: input.signal,
      })) {
        yield event;
        if (event.type === "tool-call") pendingCalls.push(event);
        if (event.type === "done" && event.finishReason !== "tool_calls") return;
      }
      if (pendingCalls.length === 0 || !input.tools) return;

      for (const event of pendingCalls) {
        const tool = input.tools[event.call.name];
        if (!tool) continue;
        const validated = await validateSchema(tool.parameters, event.call.arguments);
        const output = await tool.execute(validated, {
          userId: input.budget?.userId,
          orgId: input.budget?.orgId,
          signal: input.signal,
        });
        yield {
          type: "tool-result",
          result: { toolCallId: event.call.id, name: event.call.name, output },
        };
        messages.push({ role: "assistant", content: "" });
        messages.push({
          role: "tool",
          toolCallId: event.call.id,
          content: JSON.stringify(output),
        });
      }
    }
  }

  private mergeSignals(a?: AbortSignal, b?: AbortSignal): AbortSignal {
    if (!a) return b ?? new AbortController().signal;
    if (!b) return a;
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (a.aborted || b.aborted) {
      controller.abort();
      return controller.signal;
    }
    a.addEventListener("abort", abort);
    b.addEventListener("abort", abort);
    return controller.signal;
  }

  private async withTimeout<T>(
    signal: AbortSignal | undefined,
    ms: number,
    fn: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const controller = new AbortController();
    const merged = this.mergeSignals(signal, controller.signal);
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      if (merged.aborted) throw new OtokAiAbortedError();
      return await fn(merged);
    } catch (error) {
      if (merged.aborted && !(error instanceof OtokAiAbortedError)) {
        throw new OtokAiTimeoutError();
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (error instanceof OtokAiAbortedError || error instanceof OtokAiRateLimitError) throw error;
        if (error instanceof OtokAiProviderError && error.statusCode && error.statusCode < 500) throw error;
        if (attempt === this.retries) break;
        await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
      }
    }
    throw lastError;
  }
}

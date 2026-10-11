import type {
  AiAgentOptions,
  AiBudgetKey,
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
import { beginBilledRound } from "../budget/billed-round.js";
import { OtokAiAbortedError, OtokAiProviderError, OtokAiRateLimitError, OtokAiTimeoutError } from "../errors.js";
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
    const { signal, dispose: disposeMergedSignals } = this.mergeSignalsDisposable(
      options.signal,
      abortController.signal,
    );
    const model = options.model ?? this.defaultModel;

    const run = async function* (this: AiClient): AsyncIterable<AiStreamEvent> {
      if (options.signal?.aborted) throw new OtokAiAbortedError();
      await this.gateBudget(options.budget);
      const messages = this.prepareMessages(options.messages);
      let totalUsage = this.emptyUsage();

      let progressed = false;
      for (let attempt = 0; attempt <= this.retries; attempt += 1) {
        const scope = this.createOperationAbortScope(signal, options.timeoutMs ?? this.timeoutMs);
        try {
          const loop = this.runToolLoop({
            model,
            messages,
            tools: options.tools,
            signal: scope.signal,
            maxRounds: options.maxToolRounds ?? 5,
            budget: options.budget,
            assertNotAborted: () => scope.throwIfAborted(),
            whenAborted: scope.whenAborted,
          });
          for await (const event of this.consumeAsyncIterable(loop, {
            throwIfAborted: scope.throwIfAborted,
            whenAborted: scope.whenAborted,
          })) {
            progressed = true;
            if (event.type === "usage") totalUsage = this.addUsage(totalUsage, event.usage);
            yield event;
          }
          break;
        } catch (error) {
          if (
            progressed ||
            error instanceof OtokAiAbortedError ||
            error instanceof OtokAiTimeoutError ||
            error instanceof OtokAiRateLimitError
          ) {
            throw error;
          }
          if (error instanceof OtokAiProviderError && error.statusCode && error.statusCode < 500) throw error;
          if (attempt === this.retries) throw error;
          await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
        } finally {
          scope.dispose();
        }
      }

      this.onUsage?.(totalUsage, { userId: options.budget?.userId, orgId: options.budget?.orgId, model });
      this.onAudit?.({
        action: "ai.stream",
        userId: options.budget?.userId,
        orgId: options.budget?.orgId,
        model,
        usage: totalUsage,
        redactedPrompt: this.redact ? JSON.stringify(redactMessages(options.messages)) : undefined,
      });
    }.bind(this);

    let resolveUsage!: (u: AiUsage) => void;
    let rejectUsage!: (error: unknown) => void;
    const usagePromise = new Promise<AiUsage>((resolve, reject) => {
      resolveUsage = resolve;
      rejectUsage = reject;
    });

    const wrapped = async function* (this: AiClient) {
      try {
        await this.gateBudget(options.budget);
        let totalUsage = this.emptyUsage();
        for await (const event of run()) {
          if (event.type === "usage") totalUsage = this.addUsage(totalUsage, event.usage);
          yield event;
        }
        resolveUsage(totalUsage);
      } catch (error) {
        rejectUsage(error);
        throw error;
      } finally {
        disposeMergedSignals();
      }
    }.bind(this);

    const events = wrapped();
    const [eventsForSse, eventsForCaller] = teeAsyncIterable(events);
    void this.gateBudget(options.budget).catch((error) => rejectUsage(error));
    return {
      response: aiSseResponse(aiStreamToSse(eventsForSse)),
      events: eventsForCaller,
      usage: usagePromise,
      abort: () => abortController.abort(),
    };
  }

  async structured<T>(options: AiStructuredOptions<T>): Promise<{ data: T; usage: AiUsage; raw: string }> {
    const model = options.model ?? this.defaultModel;
    await this.gateBudget(options.budget);
    const messages = this.prepareMessages(options.messages);

    const billed = await beginBilledRound(
      this.budgetStore,
      options.budget,
      options.budget?.maxTokens ?? options.budget?.maxTokensPerPeriod,
    );
    let result: Awaited<ReturnType<AiProvider["complete"]>> | undefined;
    let unknownUsage = false;
    try {
      result = await this.withRetry(() =>
        this.withTimeout(options.signal, options.timeoutMs ?? this.timeoutMs, async ({ signal }) =>
          this.provider.complete({
            model,
            messages,
            signal,
            jsonSchema: schemaToJsonSchema(options.schema),
          }),
        ),
      );
    } catch (error) {
      unknownUsage = true;
      throw error;
    } finally {
      await billed.finalize(result?.usage, unknownUsage ? { unknownUsage: true } : undefined);
    }

    const data = await parseStructuredOutputAsync(result!.text, options.schema);
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
    const model = options.model ?? this.defaultModel;
    if (options.signal?.aborted) throw new OtokAiAbortedError();

    let messages: AiMessage[] = options.system
      ? [{ role: "system", content: options.system }, ...options.messages]
      : [...options.messages];
    messages = this.prepareMessages(messages);

    const maxSteps = options.maxSteps ?? 10;
    let totalUsage = this.emptyUsage();
    let text = "";
    let steps = 0;

    for (let step = 0; step < maxSteps; step += 1) {
      await this.gateBudget(options.budget);
      steps += 1;

      const collected = await this.collectAgentRound({
        model,
        messages,
        tools: options.tools,
        signal: options.signal,
        timeoutMs: options.timeoutMs ?? this.timeoutMs,
        budget: options.budget,
      });

      text = collected.text;
      if (collected.roundUsage) {
        totalUsage = this.addUsage(totalUsage, collected.roundUsage);
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
          content: this.redact ? redactText(JSON.stringify(output)) : JSON.stringify(output),
        });
      }
    }

    this.onUsage?.(totalUsage, { userId: options.budget?.userId, orgId: options.budget?.orgId, model });
    this.onAudit?.({
      action: "ai.agent",
      userId: options.budget?.userId,
      orgId: options.budget?.orgId,
      model,
      usage: totalUsage,
      redactedPrompt: this.redact ? JSON.stringify(redactMessages(options.messages)) : undefined,
      redactedOutput: this.redact ? redactText(text) : undefined,
    });

    return { text, usage: totalUsage, steps };
  }

  async embed(input: string | string[], options?: { model?: string; signal?: AbortSignal }) {
    return this.provider.embed({
      input,
      model: options?.model,
      signal: options?.signal,
    });
  }

  private prepareMessages(messages: AiMessage[]): AiMessage[] {
    return this.redact ? redactMessages(messages) : messages;
  }

  private async gateBudget(budget?: AiBudgetKey): Promise<void> {
    if (budget) await this.budgetStore.check(budget);
  }

  private async collectAgentRound(input: {
    model: string;
    messages: AiMessage[];
    tools?: AiToolMap;
    signal?: AbortSignal;
    timeoutMs: number;
    budget?: AiBudgetKey;
  }): Promise<{ text: string; events: AiStreamEvent[]; roundUsage?: AiUsage }> {
    const billed = await beginBilledRound(
      this.budgetStore,
      input.budget,
      input.budget?.maxTokens ?? input.budget?.maxTokensPerPeriod,
    );
    let roundUsage: AiUsage | undefined;
    let unknownUsage = false;
    try {
      const collected = await this.withTimeout(input.signal, input.timeoutMs, async (scope) =>
        collectStreamEvents(
          this.consumeAsyncIterable(
            this.provider.stream({
              model: input.model,
              messages: input.messages,
              tools: input.tools,
              signal: scope.signal,
            }),
            { throwIfAborted: scope.throwIfAborted, whenAborted: scope.whenAborted },
          ),
        ),
      );
      roundUsage = collected.usage?.usage;
      return { text: collected.text, events: collected.events, roundUsage };
    } catch (error) {
      if (
        error instanceof OtokAiAbortedError ||
        error instanceof OtokAiTimeoutError ||
        error instanceof OtokAiProviderError
      ) {
        unknownUsage = !roundUsage;
      }
      throw error;
    } finally {
      await billed.finalize(roundUsage, unknownUsage ? { unknownUsage: true } : undefined);
    }
  }

  private emptyUsage(): AiUsage {
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }

  private addUsage(left: AiUsage, right: AiUsage): AiUsage {
    return {
      promptTokens: left.promptTokens + right.promptTokens,
      completionTokens: left.completionTokens + right.completionTokens,
      totalTokens: left.totalTokens + right.totalTokens,
      estimatedCostUsd: (left.estimatedCostUsd ?? 0) + (right.estimatedCostUsd ?? 0),
    };
  }

  private async *runToolLoop(input: {
    model: string;
    messages: AiMessage[];
    tools?: AiToolMap;
    signal: AbortSignal;
    maxRounds: number;
    budget?: AiStreamOptions["budget"];
    assertNotAborted: () => void;
    whenAborted: Promise<never>;
  }): AsyncIterable<AiStreamEvent> {
    const messages = [...input.messages];
    for (let round = 0; round < input.maxRounds; round += 1) {
      if (input.signal.aborted) return;
      await this.gateBudget(input.budget);
      const pendingCalls: Array<{ type: "tool-call"; call: { id: string; name: string; arguments: unknown } }> = [];
      const billed = await beginBilledRound(
        this.budgetStore,
        input.budget,
        input.budget?.maxTokens ?? input.budget?.maxTokensPerPeriod,
      );
      let roundUsage: AiUsage | undefined;
      let unknownUsage = false;
      try {
        for await (const event of this.consumeAsyncIterable(
          this.provider.stream({
            model: input.model,
            messages,
            tools: input.tools,
            signal: input.signal,
          }),
          {
            throwIfAborted: input.assertNotAborted,
            whenAborted: input.whenAborted,
          },
        )) {
          yield event;
          if (event.type === "usage") roundUsage = event.usage;
          if (event.type === "tool-call") pendingCalls.push(event);
          if (event.type === "done" && event.finishReason !== "tool_calls") return;
        }
      } catch (error) {
        unknownUsage = !roundUsage;
        throw error;
      } finally {
        await billed.finalize(roundUsage, unknownUsage ? { unknownUsage: true } : undefined);
      }
      if (pendingCalls.length === 0 || !input.tools) return;

      for (const event of pendingCalls) {
        input.assertNotAborted();
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
          content: this.redact ? redactText(JSON.stringify(output)) : JSON.stringify(output),
        });
      }
      if (input.signal.aborted) return;
    }
  }

  private mergeSignalsDisposable(a?: AbortSignal, b?: AbortSignal): { signal: AbortSignal; dispose: () => void } {
    if (!a && !b) {
      const controller = new AbortController();
      return { signal: controller.signal, dispose: () => undefined };
    }
    if (!a) return { signal: b!, dispose: () => undefined };
    if (!b) return { signal: a, dispose: () => undefined };

    const controller = new AbortController();
    const abort = () => controller.abort();
    if (a.aborted || b.aborted) {
      controller.abort();
      return { signal: controller.signal, dispose: () => undefined };
    }
    a.addEventListener("abort", abort);
    b.addEventListener("abort", abort);
    return {
      signal: controller.signal,
      dispose: () => {
        a.removeEventListener("abort", abort);
        b.removeEventListener("abort", abort);
      },
    };
  }

  private createOperationAbortScope(
    userSignal: AbortSignal | undefined,
    timeoutMs: number,
  ): {
    signal: AbortSignal;
    dispose: () => void;
    throwIfAborted: () => void;
    whenAborted: Promise<never>;
  } {
    const timeoutController = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      timeoutController.abort();
    }, timeoutMs);
    const { signal, dispose: disposeMerge } = this.mergeSignalsDisposable(userSignal, timeoutController.signal);

    const dispose = () => {
      clearTimeout(timer);
      disposeMerge();
    };

    const throwIfAborted = () => {
      if (!signal.aborted) return;
      if (timedOut) throw new OtokAiTimeoutError();
      throw new OtokAiAbortedError();
    };

    const whenAborted = new Promise<never>((_, reject) => {
      const fail = () => {
        try {
          throwIfAborted();
        } catch (error) {
          reject(error);
        }
      };
      signal.addEventListener("abort", fail, { once: true });
    });

    return { signal, dispose, throwIfAborted, whenAborted };
  }

  private async raceIteratorNext<T>(
    promise: Promise<IteratorResult<T>>,
    scope: { throwIfAborted: () => void; whenAborted: Promise<never> },
  ): Promise<IteratorResult<T>> {
    scope.throwIfAborted();
    try {
      return await Promise.race([promise, scope.whenAborted]);
    } finally {
      void promise.catch(() => undefined);
    }
  }

  private async *consumeAsyncIterable<T>(
    iterable: AsyncIterable<T>,
    scope: { throwIfAborted: () => void; whenAborted: Promise<never> },
  ): AsyncGenerator<T> {
    const iterator = iterable[Symbol.asyncIterator]();
    try {
      while (true) {
        const result = await this.raceIteratorNext(iterator.next(), scope);
        if (result.done) return;
        yield result.value;
      }
    } finally {
      void iterator.return?.().catch(() => undefined);
    }
  }

  private async withTimeout<T>(
    signal: AbortSignal | undefined,
    ms: number,
    fn: (ctx: { signal: AbortSignal; throwIfAborted: () => void; whenAborted: Promise<never> }) => Promise<T>,
  ): Promise<T> {
    const scope = this.createOperationAbortScope(signal, ms);
    try {
      scope.throwIfAborted();
      return await fn({
        signal: scope.signal,
        throwIfAborted: scope.throwIfAborted,
        whenAborted: scope.whenAborted,
      });
    } catch (error) {
      if (scope.signal.aborted && !(error instanceof OtokAiAbortedError) && !(error instanceof OtokAiTimeoutError)) {
        scope.throwIfAborted();
      }
      throw error;
    } finally {
      scope.dispose();
    }
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (
          error instanceof OtokAiAbortedError ||
          error instanceof OtokAiTimeoutError ||
          error instanceof OtokAiRateLimitError
        ) {
          throw error;
        }
        if (error instanceof OtokAiProviderError && error.statusCode && error.statusCode < 500) throw error;
        if (attempt === this.retries) break;
        await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
      }
    }
    throw lastError;
  }
}

/** Standard Schema V1 compatible — same contract as @kamod-ch/otok-validation. */
export type StandardSchemaIssue = {
  message: string;
  path?: ReadonlyArray<PropertyKey>;
};

export type StandardSchemaResult<Output> =
  | { value: Output; issues?: undefined }
  | { issues: ReadonlyArray<StandardSchemaIssue>; value?: undefined };

export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    validate: (
      value: unknown,
    ) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>;
  };
}

/** Any Standard Schema V1 validator (Zod 4, Valibot, etc.). */
export type AiSchema<T = unknown> = {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    validate: (value: unknown) => unknown;
  };
} & { readonly __aiOutput?: T };

export type AiRole = "system" | "user" | "assistant" | "tool";

export interface AiTextMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiToolMessage {
  role: "tool";
  toolCallId: string;
  content: string;
}

export type AiMessage = AiTextMessage | AiToolMessage;

export interface AiToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export interface AiToolResult {
  toolCallId: string;
  name: string;
  output: unknown;
}

export interface AiUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd?: number;
}

export interface AiBudgetKey {
  userId?: string;
  orgId?: string;
  /** Per-request cap */
  maxTokens?: number;
  /** Per-period cap in USD */
  maxCostUsd?: number;
}

export interface AiBudgetRecord {
  key: string;
  tokensUsed: number;
  costUsd: number;
  periodStart: string;
  periodEnd: string;
}

export interface AiBudgetStore {
  check(key: AiBudgetKey, estimatedTokens?: number): Promise<void>;
  record(key: AiBudgetKey, usage: AiUsage): Promise<void>;
  getUsage(key: AiBudgetKey): Promise<AiBudgetRecord | null>;
}

export type AiStreamEvent =
  | { type: "text-delta"; delta: string }
  | { type: "tool-call"; call: AiToolCall }
  | { type: "tool-result"; result: AiToolResult }
  | { type: "usage"; usage: AiUsage }
  | { type: "done"; finishReason: "stop" | "tool_calls" | "length" | "abort" | "error" };

export interface AiStreamResult {
  /** SSE-compatible Response for route actions */
  response: Response;
  /** Async iterator for programmatic consumption */
  events: AsyncIterable<AiStreamEvent>;
  usage: Promise<AiUsage>;
  abort: () => void;
}

export interface AiCompletionResult {
  text: string;
  toolCalls?: AiToolCall[];
  usage: AiUsage;
  finishReason: string;
}

export interface AiStructuredResult<T> {
  data: T;
  usage: AiUsage;
  raw: string;
}

export interface AiToolContext {
  userId?: string;
  orgId?: string;
  signal?: AbortSignal;
  requestId?: string;
}

export interface AiToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  parameters: AiSchema<TInput>;
  execute: (input: TInput, ctx: AiToolContext) => Promise<TOutput>;
}

export type AiToolMap = Record<string, AiToolDefinition<any, any>>;

export interface AiStreamOptions {
  model?: string;
  messages: AiMessage[];
  tools?: AiToolMap;
  budget?: AiBudgetKey;
  signal?: AbortSignal;
  timeoutMs?: number;
  retries?: number;
  maxToolRounds?: number;
  redact?: boolean;
}

export interface AiStructuredOptions<T> {
  model?: string;
  messages: AiMessage[];
  schema: AiSchema<T>;
  budget?: AiBudgetKey;
  signal?: AbortSignal;
  timeoutMs?: number;
  retries?: number;
}

export interface AiAgentOptions extends AiStreamOptions {
  system?: string;
  maxSteps?: number;
}

export interface AiEmbedOptions {
  model?: string;
  input: string | string[];
  signal?: AbortSignal;
}

export interface AiEmbedResult {
  embeddings: number[][];
  usage: AiUsage;
  model: string;
}

export interface AiProviderCapabilities {
  streaming: boolean;
  tools: boolean;
  structuredOutput: boolean;
  embeddings: boolean;
}

export interface AiProviderChatOptions {
  model: string;
  messages: AiMessage[];
  tools?: AiToolMap;
  signal?: AbortSignal;
  jsonSchema?: unknown;
}

export interface AiProvider {
  readonly id: string;
  readonly capabilities: AiProviderCapabilities;
  stream(options: AiProviderChatOptions): AsyncIterable<AiStreamEvent>;
  complete(options: AiProviderChatOptions): Promise<AiCompletionResult>;
  embed(options: AiEmbedOptions): Promise<AiEmbedResult>;
}

export interface AiProviderConfig {
  type: "test";
  responses?: Record<string, string>;
}
export interface OpenAiProviderConfig {
  type: "openai";
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  embeddingModel?: string;
  /** USD per 1M prompt tokens */
  promptCostPer1M?: number;
  /** USD per 1M completion tokens */
  completionCostPer1M?: number;
}

export type AiProviderFactoryConfig = AiProviderConfig | OpenAiProviderConfig;

export interface AiConversationStore {
  get(conversationId: string): Promise<AiMessage[] | null>;
  append(conversationId: string, messages: AiMessage[]): Promise<void>;
  clear(conversationId: string): Promise<void>;
}

export interface AiPluginOptions {
  provider: AiProviderFactoryConfig;
  defaultModel?: string;
  budgetStore?: AiBudgetStore;
  conversationStore?: AiConversationStore;
  /** Default timeout for generations (ms) */
  timeoutMs?: number;
  /** Default retries on transient provider errors */
  retries?: number;
  /** Redact prompts/outputs in logs and audit */
  redact?: boolean;
  /** AI-specific rate limit: requests per window */
  rateLimit?: { windowMs: number; max: number };
  /** Routes exposed via MCP (explicit allowlist) */
  mcpRoutes?: readonly string[];
  mcpPath?: string;
  /** Path for llms.txt */
  llmsPath?: string;
}

export interface AiRuntime {
  client: import("./client/ai-client.js").AiClient;
  provider: AiProvider;
  defaultModel: string;
  budgetStore: AiBudgetStore;
  conversationStore: AiConversationStore;
  redact: boolean;
  mcpRoutes: readonly string[];
  mcpPath: string;
  llmsPath: string;
}

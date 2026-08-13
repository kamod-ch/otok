import type { Hono } from "hono";
import { resolveOtokConfig, type OtokConfigEnv, type OtokPluginInput, type OtokUserConfig } from "@kamod-ch/otok";
import { parseHtml, type ParsedHtml } from "./html.js";
import { mergeSessionHeaders, type OtokTestSession } from "./session.js";
import { createTestApp, type CreateTestAppOptions } from "./create-app.js";
import type { TestDatabaseHooks } from "./database.js";

export interface OtokTestRequestOptions extends Omit<RequestInit, "headers"> {
  session?: OtokTestSession;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface OtokTestRenderResult {
  response: Response;
  html: string;
  document: ParsedHtml;
}

export class OtokTestResponse {
  constructor(
    readonly response: Response,
    readonly html?: string,
  ) {}

  get status(): number {
    return this.response.status;
  }

  get headers(): Headers {
    return this.response.headers;
  }

  async text(): Promise<string> {
    return this.html ?? (await this.response.text());
  }

  async json<T = unknown>(): Promise<T> {
    return (await this.response.clone().json()) as T;
  }

  get document(): ParsedHtml {
    if (!this.html) {
      throw new Error("OtokTestResponse.document requires HTML content. Use render() or a GET/POST helper.");
    }
    return parseHtml(this.html);
  }
}

export interface CreateOtokTestAppOptions extends Omit<CreateTestAppOptions, "configure"> {
  plugins?: OtokPluginInput[];
  config?: Partial<OtokUserConfig>;
  root?: string;
  env?: Partial<OtokConfigEnv>;
  database?: TestDatabaseHooks;
  configure?: (app: Hono) => void;
}

export class OtokTestApp {
  readonly hono: Hono;
  private readonly database?: TestDatabaseHooks;

  constructor(hono: Hono, database?: TestDatabaseHooks) {
    this.hono = hono;
    this.database = database;
  }

  async cleanup(): Promise<void> {
    if (this.database?.cleanup) await this.database.cleanup();
  }

  async request(path: string, init?: OtokTestRequestOptions): Promise<OtokTestResponse> {
    const headers = new Headers(init?.headers);
    const requestInit = mergeSessionHeaders({ ...init, headers }, init?.session, init?.cookies);
    const response = await this.hono.request(path, requestInit);
    const contentType = response.headers.get("content-type") ?? "";
    const html = contentType.includes("text/html") ? await response.clone().text() : undefined;
    return new OtokTestResponse(response, html);
  }

  get(path: string, init?: OtokTestRequestOptions): Promise<OtokTestResponse> {
    return this.request(path, { ...init, method: "GET" });
  }

  head(path: string, init?: OtokTestRequestOptions): Promise<OtokTestResponse> {
    return this.request(path, { ...init, method: "HEAD" });
  }

  post(path: string, init?: OtokTestRequestOptions): Promise<OtokTestResponse> {
    return this.request(path, { ...init, method: "POST" });
  }

  put(path: string, init?: OtokTestRequestOptions): Promise<OtokTestResponse> {
    return this.request(path, { ...init, method: "PUT" });
  }

  patch(path: string, init?: OtokTestRequestOptions): Promise<OtokTestResponse> {
    return this.request(path, { ...init, method: "PATCH" });
  }

  delete(path: string, init?: OtokTestRequestOptions): Promise<OtokTestResponse> {
    return this.request(path, { ...init, method: "DELETE" });
  }

  async render(path: string, init?: OtokTestRequestOptions): Promise<OtokTestRenderResult> {
    const result = await this.request(path, init);
    const html = await result.text();
    return { response: result.response, html, document: parseHtml(html) };
  }
}

/** Create a typed Otok test client without opening a network port. */
export async function createOtokTestApp(options: CreateOtokTestAppOptions): Promise<OtokTestApp> {
  const { plugins = [], config, root = "/tmp/otok-test", env, database, configure, ...rest } = options;

  if (database?.setup) await database.setup();

  let resolvedConfigure = configure;
  if (plugins.length > 0 || config) {
    const resolved = await resolveOtokConfig(
      { plugins, ...config },
      {
        root,
        mode: env?.mode ?? "test",
        command: env?.command ?? "build",
        ...env,
      },
    );
    resolvedConfigure = (app) => {
      configure?.(app);
      void resolved.applyAppPlugins(app);
    };
  }

  const hono = createTestApp({ ...rest, configure: resolvedConfigure });
  return new OtokTestApp(hono, database);
}

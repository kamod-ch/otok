import { describe, expect, it, beforeEach } from "vitest";
import { Hono } from "hono";
import { OTOK_MATCHED_ROUTE_PATTERN_KEY } from "@kamod-ch/otok/shared";
import { createRedactor, sanitizeRequestPath } from "./redaction.js";
import { createJsonLogger } from "./logger.js";
import { createMemoryTracer } from "./tracing.js";
import observability from "./plugin.js";
import { resetObservabilityRuntimeForTests } from "./registry.js";

const TEST_TOKEN = "otok-url-sanitize-test-token-abc123XYZ";

describe("redaction", () => {
  it("redacts sensitive keys and nested values", () => {
    const redactor = createRedactor();
    const result = redactor.redactObject({
      user: "alice",
      password: "secret",
      token: "abc",
      nested: { cookie: "sid=1" },
    });
    expect(result.user).toBe("alice");
    expect(result.password).toBe("[REDACTED]");
    expect(result.token).toBe("[REDACTED]");
    expect((result.nested as Record<string, string>).cookie).toBe("[REDACTED]");
  });

  it("redacts form data fields", () => {
    const redactor = createRedactor();
    const form = new FormData();
    form.set("email", "a@b.c");
    form.set("password", "secret");
    expect(redactor.redactFormData(form)).toEqual({ email: "a@b.c", password: "[REDACTED]" });
  });

  it("re-exports sanitizeRequestPath for error metadata", () => {
    const path = sanitizeRequestPath(`http://localhost/x?token=${TEST_TOKEN}`);
    expect(path).toBe("/x");
    expect(path).not.toContain(TEST_TOKEN);
  });
});

describe("logger", () => {
  it("emits JSON without secrets", () => {
    const lines: string[] = [];
    const original = console.info;
    console.info = ((line: string) => lines.push(line)) as typeof console.info;
    try {
      const logger = createJsonLogger();
      logger.info("test", { token: "secret", ok: true });
      const parsed = JSON.parse(lines[0]!);
      expect(parsed.token).toBe("[REDACTED]");
      expect(parsed.ok).toBe(true);
    } finally {
      console.info = original;
    }
  });
});

describe("tracing", () => {
  it("records span durations", () => {
    const tracer = createMemoryTracer();
    const span = tracer.startSpan("loader:/");
    tracer.endSpan(span);
    expect(tracer.spans[0]?.end).toBeTypeOf("number");
  });
});

describe("observability plugin", () => {
  beforeEach(() => {
    resetObservabilityRuntimeForTests();
  });

  it("adds request id header", async () => {
    const plugin = observability();
    const app = new Hono();
    await plugin.configureApp?.({
      app,
      root: "/tmp",
      mode: "test",
      command: "serve",
      userConfig: {},
      config: {},
    } as never);
    app.get("/", (c) => c.text("ok"));

    const response = await app.request("/");
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });

  it("never logs raw URL tokens in request logs", async () => {
    const logLines: string[] = [];
    const originalInfo = console.info;
    console.info = ((line: string) => logLines.push(line)) as typeof console.info;

    try {
      const plugin = observability();
      const app = new Hono();
      await plugin.configureApp?.({
        app,
        root: "/tmp",
        mode: "test",
        command: "serve",
        userConfig: {},
        config: {},
      } as never);

      app.get(`/invite/${TEST_TOKEN}`, (c) => {
        c.set(OTOK_MATCHED_ROUTE_PATTERN_KEY as never, "/invite/:token");
        return c.text("ok");
      });

      await app.request(`/invite/${TEST_TOKEN}?token=${TEST_TOKEN}`);

      const combined = logLines.join("\n");
      expect(combined).not.toContain(TEST_TOKEN);

      const requestLog = logLines.find((line) => line.includes("request completed"));
      expect(requestLog).toBeTruthy();
      const parsed = JSON.parse(requestLog!);
      expect(parsed.path).toBe("/invite/:token");
      expect(parsed.method).toBe("GET");
      expect(parsed.status).toBe(200);
    } finally {
      console.info = originalInfo;
    }
  });
});

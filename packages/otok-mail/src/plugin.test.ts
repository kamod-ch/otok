import { describe, expect, it, beforeEach } from "vitest";
import { Hono } from "hono";
import { h } from "preact";
import type { AppContext } from "otok";
import mail, { configureMailApp, getMailClient, resetMailClientForTests } from "./plugin.js";
import { resetMailRuntimeForTests } from "./registry.js";
import { resetTestMailProvider } from "./providers/test.js";
import type { MailTemplateProps } from "./types.js";

function testAppContext(app: Hono): AppContext {
  return {
    app,
    adapter: {
      adapter: {
        name: "test-adapter",
        runtime: "node",
        capabilities: [],
        outputDirs: () => ({ root: "dist", server: "dist/server", client: "dist/client" }),
      },
      options: {},
      outDirs: { root: "dist", server: "dist/server", client: "dist/client" },
      capabilities: new Set(),
    },
    config: { plugins: [] },
    mode: "development",
    command: "serve",
    root: process.cwd(),
    userConfig: { plugins: [] },
  };
}

function WelcomeTemplate(props: MailTemplateProps & { name: string }) {
  return h("p", null, `Hello ${props.name}`);
}

describe("mail plugin", () => {
  beforeEach(() => {
    resetMailRuntimeForTests();
    resetMailClientForTests();
    resetTestMailProvider();
  });

  it("registers mail client and sends via test provider", async () => {
    const plugin = mail({
      provider: { type: "test" },
      defaultFrom: "app@example.com",
      preview: true,
    });

    const app = new Hono();
    await plugin.configureApp?.(testAppContext(app));

    const client = getMailClient();
    const result = await client.send({
      to: "user@example.com",
      subject: "Welcome",
      text: "Hello",
    });

    expect(result.provider).toBe("test");
    expect(result.accepted).toEqual(["user@example.com"]);

    const preview = await app.request("/__otok-mail/preview");
    expect(preview.status).toBe(200);
    const html = await preview.text();
    expect(html).toContain("Welcome");
    expect(html).toContain("Hello");
  });

  it("renders preact templates", async () => {
    const plugin = mail({
      provider: { type: "test" },
      defaultFrom: "app@example.com",
      preview: false,
    });

    const app = new Hono();
    await plugin.configureApp?.(testAppContext(app));

    const client = getMailClient();
    await client.sendTemplate({
      to: "user@example.com",
      subject: "Welcome",
      template: WelcomeTemplate,
      props: { name: "Ada" },
    });

    const previewDisabled = await app.request("/__otok-mail/preview");
    expect(previewDisabled.status).toBe(404);
  });

  it("validates plugin options", async () => {
    await expect(
      configureMailApp(new Hono(), {
        provider: { type: "test" },
        defaultFrom: "",
      }),
    ).rejects.toThrow(/defaultFrom/);
  });
});

describe("resend provider", () => {
  it("throws retryable errors on rate limits", async () => {
    const { createResendMailProvider } = await import("./providers/resend.js");
    const provider = createResendMailProvider({ type: "resend", apiKey: "test_key" });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response("rate limited", { status: 429 });

    try {
      await expect(
        provider.send({
          from: "app@example.com",
          to: "user@example.com",
          subject: "Hi",
          text: "Hello",
        }),
      ).rejects.toMatchObject({ retryable: true });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("factory", () => {
  it("rejects unknown provider types", async () => {
    const { createMailProvider } = await import("./factory.js");
    await expect(createMailProvider({ type: "unknown" } as never)).rejects.toThrow(/unknown mail provider/);
  });
});

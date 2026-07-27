import { definePlugin } from "otok";
import type { Hono } from "hono";
import { createMailClient } from "./client.js";
import { createMailProvider } from "./factory.js";
import { configureMailPreviewRoute } from "./preview.js";
import { registerMailRuntime } from "./registry.js";
import { OtokMailConfigError } from "./errors.js";
import type { MailPluginOptions, MailRuntime } from "./types.js";
import { resolveRetryOptions } from "./utils.js";

let client: ReturnType<typeof createMailClient> | null = null;

/** @internal Test helper */
export function resetMailClientForTests(): void {
  client = null;
}

export function getMailClient() {
  if (!client) {
    throw new Error(
      "otok-mail: no mail client registered. Add mail() to otok.config.ts plugins.",
    );
  }
  return client;
}

export async function configureMailApp(app: Hono, options: MailPluginOptions): Promise<MailRuntime> {
  if (!options.defaultFrom?.trim()) {
    throw new OtokMailConfigError("mail() requires defaultFrom");
  }

  const provider = await createMailProvider(options.provider);
  const retry = resolveRetryOptions(options.retry);
  const previewEnabled = options.preview ?? process.env.NODE_ENV !== "production";

  const runtime: MailRuntime = {
    provider,
    defaultFrom: options.defaultFrom,
    previewEnabled,
    retry,
  };

  registerMailRuntime(runtime);
  client = createMailClient(provider, options.defaultFrom, retry);

  if (previewEnabled) {
    configureMailPreviewRoute(app, runtime);
  }

  return runtime;
}

const mailPluginFactory = definePlugin<MailPluginOptions>({
  name: "@kamod-ch/otok-mail",
  version: "0.1.0",
  schema: {
    parse(input) {
      if (!input || typeof input !== "object") {
        throw new OtokMailConfigError("mail() options must be an object");
      }
      const record = input as Record<string, unknown>;
      if (!record.provider || typeof record.provider !== "object") {
        throw new OtokMailConfigError("mail() requires provider configuration");
      }
      if (typeof record.defaultFrom !== "string" || !record.defaultFrom.trim()) {
        throw new OtokMailConfigError("mail() requires defaultFrom: string");
      }
      return input as MailPluginOptions;
    },
  },
  envSchema: {
    parse(input) {
      const resendKey = input.RESEND_API_KEY;
      const smtpPass = input.MAIL_SMTP_PASS;
      if (resendKey !== undefined && !resendKey) {
        throw new OtokMailConfigError("RESEND_API_KEY must not be empty when set");
      }
      if (smtpPass !== undefined && !smtpPass) {
        throw new OtokMailConfigError("MAIL_SMTP_PASS must not be empty when set");
      }
      return { resendApiKey: resendKey, smtpPass };
    },
  },
});

/**
 * Otok mail plugin factory.
 *
 * ```ts
 * import mail from "@kamod-ch/otok-mail";
 *
 * export default defineConfig({
 *   plugins: [mail({ provider: { type: "test" }, defaultFrom: "app@example.com" })],
 * });
 * ```
 */
export default function mail(options: MailPluginOptions) {
  const plugin = mailPluginFactory(options);

  plugin.configureApp = async ({ app }) => {
    await configureMailApp(app, options);
  };

  return plugin;
}

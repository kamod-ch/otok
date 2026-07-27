import type { MailProvider, MailSendResult, ResendProviderConfig } from "../types.js";
import { OtokMailSendError } from "../errors.js";
import { formatAddress, normalizeRecipients, resolveEnvValue, validateMailMessage } from "../utils.js";

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

export function createResendMailProvider(config: ResendProviderConfig): MailProvider {
  const apiKey =
    config.apiKey ?? resolveEnvValue(config.apiKeyEnv ?? "RESEND_API_KEY", "Resend API key");

  return {
    name: "resend",
    capabilities: {
      delivery: true,
      html: true,
      preview: false,
    },
    async send(message): Promise<MailSendResult> {
      validateMailMessage(message);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: formatAddress(message.from),
          to: normalizeRecipients(message.to),
          subject: message.subject,
          text: message.text,
          html: message.html,
          reply_to: message.replyTo ? formatAddress(message.replyTo) : undefined,
          headers: message.headers,
          tags: message.tags?.map((name) => ({ name, value: "true" })),
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new OtokMailSendError(
          `Resend API error (${response.status}): ${body}`,
          RETRYABLE_STATUS.has(response.status),
        );
      }

      const payload = (await response.json()) as { id?: string };
      return {
        id: payload.id ?? `resend_${Date.now()}`,
        provider: "resend",
        accepted: normalizeRecipients(message.to),
      };
    },
  };
}

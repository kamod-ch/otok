import type { MailProvider, MailSendResult, SmtpProviderConfig } from "../types.js";
import { OtokMailSendError } from "../errors.js";
import { formatAddress, normalizeRecipients, resolveEnvValue, validateMailMessage } from "../utils.js";

export async function createSmtpMailProvider(config: SmtpProviderConfig): Promise<MailProvider> {
  let nodemailer: typeof import("nodemailer");
  try {
    nodemailer = await import("nodemailer");
  } catch {
    throw new Error(
      "otok-mail: SMTP provider requires nodemailer. Install it with: pnpm add nodemailer",
    );
  }

  const pass =
    config.pass ??
    (config.user ? resolveEnvValue(config.passEnv ?? "MAIL_SMTP_PASS", "SMTP password") : undefined);

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port ?? (config.secure ? 465 : 587),
    secure: config.secure ?? false,
    auth: config.user ? { user: config.user, pass } : undefined,
  });

  return {
    name: "smtp",
    capabilities: {
      delivery: true,
      html: true,
      preview: false,
    },
    async send(message): Promise<MailSendResult> {
      validateMailMessage(message);
      try {
        const info = await transport.sendMail({
          from: formatAddress(message.from),
          to: normalizeRecipients(message.to).join(", "),
          subject: message.subject,
          text: message.text,
          html: message.html,
          replyTo: message.replyTo ? formatAddress(message.replyTo) : undefined,
          headers: message.headers,
        });
        return {
          id: info.messageId ?? `smtp_${Date.now()}`,
          provider: "smtp",
          accepted: normalizeRecipients(message.to),
        };
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "SMTP send failed";
        const retryable =
          messageText.includes("ECONNRESET") ||
          messageText.includes("ETIMEDOUT") ||
          messageText.includes("421") ||
          messageText.includes("450");
        throw new OtokMailSendError(messageText, retryable);
      }
    },
  };
}

import { isRetryableMailError, OtokMailSendError } from "./errors.js";
import type { MailProvider, MailSendResult, SendMailInput, SendTemplateInput, MailTemplateProps } from "./types.js";
import { computeBackoff, resolveRetryOptions, sleep, validateMailMessage } from "./utils.js";
import { renderMailTemplate } from "./template.js";

export class MailClient {
  constructor(
    private readonly provider: MailProvider,
    private readonly defaultFrom: string,
    private readonly retry = resolveRetryOptions(),
  ) {}

  async send(input: SendMailInput): Promise<MailSendResult> {
    const message = {
      from: input.from ?? this.defaultFrom,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
      headers: input.headers,
      tags: input.tags,
    };
    validateMailMessage(message);
    return this.sendWithRetry(message);
  }

  async sendTemplate<P extends MailTemplateProps>(input: SendTemplateInput<P>): Promise<MailSendResult> {
    const html = renderMailTemplate(input.template, input.props);
    return this.send({
      to: input.to,
      subject: input.subject,
      from: input.from,
      replyTo: input.replyTo,
      text: input.text,
      html,
    });
  }

  private async sendWithRetry(message: Parameters<MailProvider["send"]>[0]): Promise<MailSendResult> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.retry.maxAttempts; attempt += 1) {
      try {
        return await this.provider.send(message);
      } catch (error) {
        lastError = error;
        const retryable = isRetryableMailError(error);
        if (!retryable || attempt >= this.retry.maxAttempts) break;
        await sleep(computeBackoff(attempt, this.retry.initialBackoffMs, this.retry.maxBackoffMs));
      }
    }
    throw lastError instanceof Error ? lastError : new OtokMailSendError("Failed to send mail");
  }
}

export function createMailClient(
  provider: MailProvider,
  defaultFrom: string,
  retry?: ReturnType<typeof resolveRetryOptions>,
): MailClient {
  return new MailClient(provider, defaultFrom, resolveRetryOptions(retry));
}

import type { MailMessage, MailProvider, MailSendResult } from "../types.js";
import { formatAddress, normalizeRecipients, validateMailMessage } from "../utils.js";

export interface CapturedMail extends MailMessage {
  id: string;
  sentAt: string;
}

const captured: CapturedMail[] = [];

/** @internal Test helper */
export function resetTestMailProvider(): void {
  captured.length = 0;
}

export function getCapturedMail(): readonly CapturedMail[] {
  return captured;
}

export function createTestMailProvider(): MailProvider {
  return {
    name: "test",
    capabilities: {
      delivery: false,
      html: true,
      preview: true,
    },
    async send(message: MailMessage): Promise<MailSendResult> {
      validateMailMessage(message);
      const id = `test_${captured.length + 1}`;
      captured.push({
        ...message,
        id,
        sentAt: new Date().toISOString(),
      });
      return {
        id,
        provider: "test",
        accepted: normalizeRecipients(message.to),
      };
    },
  };
}

export function formatMailPreview(message: MailMessage): string {
  const to = normalizeRecipients(message.to).join(", ");
  const from = formatAddress(message.from);
  const parts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${message.subject}`,
    "",
    message.text ?? "(no text body)",
  ];
  if (message.html) {
    parts.push("", "--- HTML ---", message.html);
  }
  return parts.join("\n");
}

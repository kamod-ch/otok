import { OtokMailConfigError } from "./errors.js";
import type { MailProvider, MailProviderConfig } from "./types.js";
import { createMailpitMailProvider } from "./providers/mailpit.js";
import { createResendMailProvider } from "./providers/resend.js";
import { createSmtpMailProvider } from "./providers/smtp.js";
import { createTestMailProvider } from "./providers/test.js";

export async function createMailProvider(config: MailProviderConfig): Promise<MailProvider> {
  switch (config.type) {
    case "test":
      return createTestMailProvider();
    case "smtp":
      if (!config.host?.trim()) {
        throw new OtokMailConfigError("smtp provider requires host");
      }
      return createSmtpMailProvider(config);
    case "resend":
      return createResendMailProvider(config);
    case "mailpit":
      return createMailpitMailProvider(config);
    default: {
      const unknown = config as { type?: string };
      throw new OtokMailConfigError(`unknown mail provider "${unknown.type ?? "undefined"}"`);
    }
  }
}

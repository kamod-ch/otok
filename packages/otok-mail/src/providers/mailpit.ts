import type { MailpitProviderConfig, MailProvider } from "../types.js";
import { createSmtpMailProvider } from "./smtp.js";

export async function createMailpitMailProvider(
  config: MailpitProviderConfig = { type: "mailpit" },
): Promise<MailProvider> {
  const provider = await createSmtpMailProvider({
    type: "smtp",
    host: config.host ?? "127.0.0.1",
    port: config.port ?? 1025,
    secure: false,
  });

  return {
    ...provider,
    name: "mailpit",
    capabilities: {
      delivery: true,
      html: true,
      preview: true,
    },
  };
}

export function mailpitWebUrl(config: MailpitProviderConfig = { type: "mailpit" }): string {
  return config.webUrl ?? "http://127.0.0.1:8025";
}

export { default } from "./plugin.js";
export { createMailClient, MailClient } from "./client.js";
export { getMailClient, configureMailApp } from "./plugin.js";
export { createMailProvider } from "./factory.js";
export { getMailRuntime, tryGetMailRuntime } from "./registry.js";
export { renderMailTemplate } from "./template.js";
export {
  OtokMailConfigError,
  OtokMailError,
  OtokMailRuntimeError,
  OtokMailSendError,
  isRetryableMailError,
} from "./errors.js";
export type {
  MailAddress,
  MailMessage,
  MailPluginOptions,
  MailProvider,
  MailProviderCapabilities,
  MailProviderConfig,
  MailRetryOptions,
  MailRuntime,
  MailSendResult,
  MailTemplateComponent,
  MailTemplateProps,
  MailpitProviderConfig,
  ResendProviderConfig,
  SendMailInput,
  SendTemplateInput,
  SmtpProviderConfig,
  TestProviderConfig,
} from "./types.js";

export interface MailProviderCapabilities {
  /** Provider can deliver real mail (false for test/no-op providers). */
  delivery: boolean;
  /** Provider supports HTML bodies. */
  html: boolean;
  /** Provider supports development preview inspection. */
  preview: boolean;
}

export interface MailAddress {
  email: string;
  name?: string;
}

export interface MailMessage {
  from: string | MailAddress;
  to: string | MailAddress | Array<string | MailAddress>;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string | MailAddress;
  headers?: Record<string, string>;
  tags?: string[];
}

export interface MailSendResult {
  id: string;
  provider: string;
  accepted: string[];
}

export interface MailProvider {
  readonly name: string;
  readonly capabilities: MailProviderCapabilities;
  send(message: MailMessage): Promise<MailSendResult>;
}

export type SmtpProviderConfig = {
  type: "smtp";
  host: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  /** Env var name for password when pass is omitted. Defaults to MAIL_SMTP_PASS. */
  passEnv?: string;
};

export type ResendProviderConfig = {
  type: "resend";
  apiKey?: string;
  /** Env var name for API key. Defaults to RESEND_API_KEY. */
  apiKeyEnv?: string;
};

export type MailpitProviderConfig = {
  type: "mailpit";
  host?: string;
  port?: number;
  webUrl?: string;
};

export type TestProviderConfig = {
  type: "test";
};

export type MailProviderConfig =
  | TestProviderConfig
  | SmtpProviderConfig
  | ResendProviderConfig
  | MailpitProviderConfig;

export interface MailRetryOptions {
  maxAttempts?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
}

export type ResolvedRetryOptions = Required<MailRetryOptions>;

export interface MailPluginOptions {
  provider: MailProviderConfig;
  defaultFrom: string;
  /** Enable dev preview route at /__otok-mail/preview (default: true in development). */
  preview?: boolean;
  retry?: MailRetryOptions;
}

export interface MailRuntime {
  provider: MailProvider;
  defaultFrom: string;
  previewEnabled: boolean;
  retry: ResolvedRetryOptions;
}

export interface MailTemplateProps {
  [key: string]: unknown;
}

import type { JSX } from "preact";

export type MailTemplateComponent<P extends MailTemplateProps = MailTemplateProps> = (
  props: P,
) => JSX.Element;

export interface SendMailInput {
  to: MailMessage["to"];
  subject: string;
  text?: string;
  html?: string;
  from?: string | MailAddress;
  replyTo?: string | MailAddress;
  headers?: Record<string, string>;
  tags?: string[];
}

export interface SendTemplateInput<P extends MailTemplateProps = MailTemplateProps> {
  to: MailMessage["to"];
  subject: string;
  template: MailTemplateComponent<P>;
  props: P;
  from?: string | MailAddress;
  replyTo?: string | MailAddress;
  text?: string;
}

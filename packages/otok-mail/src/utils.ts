import type { MailAddress, MailMessage, ResolvedRetryOptions } from "./types.js";

export function formatAddress(address: string | MailAddress): string {
  if (typeof address === "string") return address;
  if (address.name) return `"${address.name}" <${address.email}>`;
  return address.email;
}

export function normalizeRecipients(to: MailMessage["to"]): string[] {
  const list = Array.isArray(to) ? to : [to];
  return list.map((entry) => (typeof entry === "string" ? entry : entry.email));
}

export function validateMailMessage(message: MailMessage): void {
  if (!message.subject?.trim()) {
    throw new Error("mail message requires subject");
  }
  if (!message.text && !message.html) {
    throw new Error("mail message requires text or html body");
  }
  const recipients = normalizeRecipients(message.to);
  if (recipients.length === 0) {
    throw new Error("mail message requires at least one recipient");
  }
}

export function resolveEnvValue(name: string, label: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`otok-mail: missing ${label}. Set environment variable ${name}.`);
  }
  return value.trim();
}

export const DEFAULT_RETRY: ResolvedRetryOptions = {
  maxAttempts: 3,
  initialBackoffMs: 250,
  maxBackoffMs: 5_000,
};

export function resolveRetryOptions(retry?: Partial<ResolvedRetryOptions>): ResolvedRetryOptions {
  return {
    maxAttempts: retry?.maxAttempts ?? DEFAULT_RETRY.maxAttempts,
    initialBackoffMs: retry?.initialBackoffMs ?? DEFAULT_RETRY.initialBackoffMs,
    maxBackoffMs: retry?.maxBackoffMs ?? DEFAULT_RETRY.maxBackoffMs,
  };
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function computeBackoff(attempt: number, initialMs: number, maxMs: number): number {
  const exponential = initialMs * 2 ** (attempt - 1);
  return Math.min(exponential, maxMs);
}

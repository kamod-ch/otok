import type { MailRuntime } from "./types.js";

let runtime: MailRuntime | null = null;

/** @internal Test helper */
export function resetMailRuntimeForTests(): void {
  runtime = null;
}

export function registerMailRuntime(value: MailRuntime): void {
  runtime = value;
}

export function getMailRuntime(): MailRuntime {
  if (!runtime) {
    throw new Error(
      "otok-mail: no mail runtime registered. Add mail() to otok.config.ts plugins.",
    );
  }
  return runtime;
}

export function tryGetMailRuntime(): MailRuntime | null {
  return runtime;
}

import type { StripeRuntime } from "./provider/types.js";

let runtime: StripeRuntime | null = null;

/** @internal Test helper */
export function resetStripeRuntimeForTests(): void {
  runtime = null;
}

export function registerStripeRuntime<TPlan extends string = string>(value: StripeRuntime<TPlan>): void {
  runtime = value as StripeRuntime;
}

export function getStripeRuntime<TPlan extends string = string>(): StripeRuntime<TPlan> {
  if (!runtime) {
    throw new Error(
      "otok-stripe: no stripe runtime registered. Add stripe() to otok.config.ts plugins.",
    );
  }
  return runtime as StripeRuntime<TPlan>;
}

export function getStripeProvider<TPlan extends string = string>() {
  return getStripeRuntime<TPlan>().provider;
}

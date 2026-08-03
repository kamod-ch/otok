import type { ZodType } from "zod";
import type { EventDefinition } from "./types.js";

export interface DefineEventOptions<TPayload> {
  name: string;
  version: number;
  schema?: ZodType<TPayload>;
  /** Dot-path field names redacted in logs (e.g. password, token). */
  redactFields?: readonly string[];
}

/** Declare a typed, versioned domain event. */
export function defineEvent<TPayload>(
  options: DefineEventOptions<TPayload>,
): EventDefinition<TPayload> {
  if (!options.name.trim()) {
    throw new Error("otok-events: defineEvent requires a non-empty name");
  }
  if (!Number.isInteger(options.version) || options.version < 1) {
    throw new Error(`otok-events: defineEvent("${options.name}") requires version >= 1`);
  }

  return {
    __kind: "otok-event",
    name: options.name,
    version: options.version,
    schema: options.schema,
    redactFields: options.redactFields,
  };
}

export function isEventDefinition(value: unknown): value is EventDefinition {
  return Boolean(value && typeof value === "object" && (value as EventDefinition).__kind === "otok-event");
}

export function eventKey(definition: EventDefinition): string {
  return `${definition.name}@v${definition.version}`;
}

export { z } from "zod";

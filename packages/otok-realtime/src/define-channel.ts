import type { ZodType } from "zod";
import type { AuthorizeContext, ChannelDefinition } from "./types.js";

export interface DefineChannelOptions<TEvent> {
  name: string;
  schema?: ZodType<TEvent>;
  authorize: (ctx: AuthorizeContext) => boolean | Promise<boolean>;
  maxRoomSize?: number;
}

/** Declare a typed realtime channel with authorization. */
export function defineChannel<TEvent = unknown>(
  options: DefineChannelOptions<TEvent>,
): ChannelDefinition<TEvent> {
  if (!options.name.trim()) {
    throw new Error("otok-realtime: defineChannel requires a non-empty name");
  }
  return {
    __kind: "otok-realtime-channel",
    name: options.name,
    schema: options.schema,
    authorize: options.authorize,
    maxRoomSize: options.maxRoomSize,
  };
}

export function isChannelDefinition(value: unknown): value is ChannelDefinition {
  return Boolean(
    value && typeof value === "object" && (value as ChannelDefinition).__kind === "otok-realtime-channel",
  );
}

export { z } from "zod";

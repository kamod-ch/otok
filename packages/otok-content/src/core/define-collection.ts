import type { ZodType } from "zod";
import type { CollectionDefinition, ComputedField } from "./types.js";

export interface DefineCollectionOptions<TSchema extends ZodType> {
  /** Glob source relative to content root. */
  source: string | string[];
  schema: TSchema;
  includeDrafts?: boolean;
  sort?: CollectionDefinition<TSchema>["sort"];
  references?: Record<string, string>;
  computed?: Record<string, ComputedField<TSchema>>;
  cacheTag?: string;
}

/** Declare a typed content collection backed by local markdown/mdx files. */
export function defineCollection<TSchema extends ZodType>(
  options: DefineCollectionOptions<TSchema>,
): CollectionDefinition<TSchema> {
  const sources = Array.isArray(options.source) ? options.source : [options.source];
  if (!sources.length || sources.some((s) => !s.trim())) {
    throw new Error("otok-content: defineCollection requires a non-empty `source` glob.");
  }

  return {
    __kind: "otok-collection",
    source: options.source,
    schema: options.schema,
    includeDrafts: options.includeDrafts,
    sort: options.sort,
    references: options.references,
    computed: options.computed,
    cacheTag: options.cacheTag,
  };
}

export function isCollectionDefinition(value: unknown): value is CollectionDefinition {
  return Boolean(
    value && typeof value === "object" && (value as CollectionDefinition).__kind === "otok-collection",
  );
}

export { z } from "zod";

import path from "node:path";
import { glob } from "tinyglobby";
import type { ZodType } from "zod";
import { readFrontmatter } from "./frontmatter.js";
import { gitTimestampsForFile } from "./git-dates.js";
import { updateIncrementalState, readIncrementalState, writeIncrementalState } from "./incremental.js";
import { renderContent } from "./markdown.js";
import { referenceCollectionName } from "./reference.js";
import { detectDuplicateSlugs, entryIdFromFile, routeFromEntry, slugFromRelativePath } from "./slug.js";
import { resolveSortComparator } from "./sort.js";
import { formatZodError } from "./validation.js";
import type { ResolvedReference } from "./reference.js";
import type {
  CollectionDefinition,
  ContentEntry,
  ContentManifest,
  RemoteContentSource,
  SerializedCollection,
  SerializedEntry,
} from "./types.js";
import { buildSearchIndex } from "./search.js";

const CONTENT_IGNORE = ["**/node_modules/**", "**/.otok/**", "**/.git/**"];

export interface LoadEntriesOptions {
  root: string;
  includeDrafts?: boolean;
  mdx?: boolean;
  gitDates?: boolean;
  incremental?: boolean;
  locales?: string[];
  defaultLocale?: string;
  remoteSources?: RemoteContentSource[];
}

function collectionGlobPatterns(def: CollectionDefinition): string[] {
  const sources = Array.isArray(def.source) ? def.source : [def.source];
  return sources.map((s) => s.replace(/\\/g, "/"));
}

function isDraftEntry(data: Record<string, unknown>): boolean {
  return data.draft === true;
}

function isScheduledEntry(data: Record<string, unknown>, now = Date.now()): boolean {
  const raw = data.date ?? data.publishedAt ?? data.publishDate;
  if (!raw) return false;
  const time =
    raw instanceof Date ? raw.getTime() : typeof raw === "string" ? Date.parse(raw) : Number.NaN;
  return !Number.isNaN(time) && time > now;
}

function referenceFieldsFromSchema(schema: ZodType): Record<string, string> {
  const refs: Record<string, string> = {};
  const shape = (schema as { shape?: Record<string, ZodType> }).shape;
  if (!shape) return refs;

  for (const [field, fieldSchema] of Object.entries(shape)) {
    const collectionName = referenceCollectionName(fieldSchema.description);
    if (collectionName) refs[field] = collectionName;
  }
  return refs;
}

function mergedReferences(def: CollectionDefinition): Record<string, string> {
  return {
    ...referenceFieldsFromSchema(def.schema),
    ...(def.references ?? {}),
  };
}

function validateEntry<TSchema extends ZodType>(
  schema: TSchema,
  file: string,
  frontmatter: Record<string, unknown>,
) {
  const parsed = schema.safeParse(frontmatter);
  if (!parsed.success) throw formatZodError(file, parsed.error);
  return parsed.data;
}

function detectLocale(relativePath: string, locales?: string[]): string | undefined {
  if (!locales?.length) return undefined;
  const first = relativePath.split("/")[0];
  return locales.includes(first) ? first : undefined;
}

function stripLocalePrefix(relativePath: string, locale?: string): string {
  if (!locale) return relativePath;
  return relativePath.startsWith(`${locale}/`) ? relativePath.slice(locale.length + 1) : relativePath;
}

async function globCollectionFiles(
  def: CollectionDefinition,
  root: string,
): Promise<string[]> {
  const matched = new Set<string>();
  for (const pattern of collectionGlobPatterns(def)) {
    const hits = await glob([pattern], {
      cwd: root,
      absolute: true,
      ignore: CONTENT_IGNORE,
    });
    for (const hit of hits) matched.add(hit);
  }
  return [...matched].sort();
}

function resolveEntryReferences(
  entry: ContentEntry,
  references: Record<string, string>,
  registryEntries: Map<string, Map<string, ContentEntry>>,
): ContentEntry {
  const data = { ...(entry.data as Record<string, unknown>) };

  for (const [field, collectionName] of Object.entries(references)) {
    const raw = data[field];
    if (typeof raw !== "string" || !raw.trim()) continue;

    const lookup = registryEntries.get(collectionName);
    const resolved = lookup?.get(raw) ?? lookup?.get(raw.trim());
    if (!resolved) {
      throw new Error(
        `otok-content: ${entry.relativePath} references missing ${collectionName} entry "${raw}"`,
      );
    }

    const ref: ResolvedReference = {
      id: resolved.id,
      slug: resolved.slug,
      route: resolved.route,
      data: resolved.data,
    };
    data[field] = ref;
  }

  return { ...entry, data };
}

async function applyComputedFields(
  def: CollectionDefinition,
  entry: ContentEntry,
): Promise<ContentEntry> {
  if (!def.computed) return entry;
  const data = { ...(entry.data as Record<string, unknown>) };
  for (const [field, fn] of Object.entries(def.computed)) {
    data[field] = await fn(entry);
  }
  return { ...entry, data };
}

export async function loadCollectionEntries<TData = unknown>(
  collectionName: string,
  def: CollectionDefinition,
  options: LoadEntriesOptions,
  registryEntries: Map<string, Map<string, ContentEntry>> = new Map(),
): Promise<ContentEntry<TData>[]> {
  const files = await globCollectionFiles(def, options.root);
  const includeDrafts = options.includeDrafts ?? def.includeDrafts ?? false;
  const sort = resolveSortComparator(def.sort ?? "slug:asc");
  const references = mergedReferences(def);
  const now = Date.now();

  const entries: ContentEntry<TData>[] = [];

  for (const file of files) {
    const { meta, body } = readFrontmatter(file);
    const data = validateEntry(def.schema, file, meta) as TData;
    const record = data as Record<string, unknown>;

    if (!includeDrafts && (isDraftEntry(record) || isScheduledEntry(record, now))) {
      continue;
    }

    const relativePath = path.relative(options.root, file).split(path.sep).join("/");
    const locale = detectLocale(relativePath, options.locales);
    const pathWithoutLocale = stripLocalePrefix(relativePath, locale);
    const id = entryIdFromFile(options.root, file);
    const slug = slugFromRelativePath(pathWithoutLocale);
    const route = routeFromEntry(collectionName, slug, locale);

    let html: string | undefined;
    let toc = undefined;
    if (options.mdx !== false) {
      const rendered = await renderContent(file, body);
      html = rendered.html;
      toc = rendered.toc;
    }

    const git = options.gitDates ? gitTimestampsForFile(file) : undefined;

    let entry: ContentEntry<TData> = {
      id,
      slug,
      route,
      relativePath,
      file,
      locale,
      collection: collectionName,
      data,
      html,
      toc,
      git,
    };

    entry = (await applyComputedFields(def, entry)) as ContentEntry<TData>;
    entries.push(entry);
  }

  detectDuplicateSlugs(entries, collectionName);
  entries.sort(sort);

  if (Object.keys(references).length === 0) {
    return entries;
  }

  return entries.map((entry) =>
    resolveEntryReferences(entry, references, registryEntries),
  ) as ContentEntry<TData>[];
}

function serializeEntry(entry: ContentEntry): SerializedEntry {
  return {
    id: entry.id,
    slug: entry.slug,
    route: entry.route,
    relativePath: entry.relativePath,
    file: entry.file,
    locale: entry.locale,
    data: entry.data,
    html: entry.html,
    toc: entry.toc,
    git: entry.git,
  };
}

export async function buildContentManifest(
  collections: Map<string, CollectionDefinition>,
  options: LoadEntriesOptions,
): Promise<ContentManifest> {
  const registryEntries = new Map<string, Map<string, ContentEntry>>();
  const serialized: Record<string, SerializedCollection> = {};
  const searchIndex = [];

  for (const [name, def] of [...collections.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const entries = await loadCollectionEntries(name, def, options, registryEntries);
    registryEntries.set(name, new Map(entries.map((e) => [e.id, e])));
    serialized[name] = {
      name,
      cacheTag: def.cacheTag ?? `content:${name}`,
      entries: entries.map(serializeEntry),
    };
    searchIndex.push(...buildSearchIndex(name, entries));
  }

  if (options.incremental) {
    const allFiles = Object.values(serialized).flatMap((c) => c.entries.map((e) => e.file));
    const state = updateIncrementalState(readIncrementalState(options.root), allFiles);
    writeIncrementalState(options.root, state);
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    root: options.root,
    collections: serialized,
    searchIndex,
  };
}

export {
  collectionGlobPatterns,
  isDraftEntry,
  isScheduledEntry,
  mergedReferences,
};

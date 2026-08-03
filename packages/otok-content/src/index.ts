export {
  defineCollection,
  z,
  isCollectionDefinition,
} from "./core/define-collection.js";
export { reference, reference as contentReference } from "./core/reference.js";
export type {
  CollectionDefinition,
  ContentEntry,
  ContentManifest,
  ContentCollectionsConfig,
  InferCollectionData,
  InferCollectionEntry,
  PaginationResult,
  SearchIndexEntry,
  RemoteContentSource,
  TocItem,
} from "./core/types.js";
export {
  ContentValidationError,
  DuplicateSlugError,
  formatZodError,
} from "./core/validation.js";
export { paginateCollection } from "./core/pagination.js";
export { groupByTaxonomy } from "./core/taxonomies.js";
export { buildSearchIndex, searchIndex } from "./core/search.js";
export {
  renderRssFeed,
  renderAtomFeed,
  contentEntriesToSitemapUrls,
} from "./core/feeds.js";
export { createRegistry, ContentRegistry } from "./core/registry.js";
export { buildContentManifest, loadCollectionEntries } from "./core/load-entries.js";
export { renderMarkdown, renderContent } from "./core/markdown.js";
export { extractToc } from "./core/toc.js";

export { getCollection, getEntry, getEntryOrThrow } from "./runtime/query.js";
export { setContentManifest, getContentManifest } from "./runtime/query.js";

export { blogPreset, docsPreset, knowledgeBasePreset } from "./presets/index.js";

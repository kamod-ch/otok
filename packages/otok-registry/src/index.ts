export {
  REGISTRY_SCHEMA_VERSION,
  PublisherSchema,
  ExtensionEntrySchema,
  RegistryIndexSchema,
  RegistryBundleSchema,
} from "./schema.js";
export type {
  Publisher,
  ExtensionEntry,
  RegistryIndex,
  RegistryBundle,
  LoadedRegistry,
  RegistrySearchQuery,
  ExtensionTier,
  RuntimeTarget,
  CompatibilityResult,
  RegistryClientOptions,
} from "./schema.js";

export {
  sha256Checksum,
  validateRegistryIndex,
  validateRegistryBundle,
  validateExtensionEntry,
  verifyBundleChecksum,
  indexRegistry,
  assertVerifiedPublisher,
} from "./validate.js";

export { searchExtensions, resolveExtension, formatExtensionDetail } from "./search.js";
export { checkCompatibility, findOutdated, type ProjectContext } from "./compatibility.js";
export { satisfiesRange } from "./semver.js";

export {
  RegistryClient,
  createRegistryClient,
  loadBundledRegistry,
  parseRegistryPayload,
  bundledRegistryDir,
} from "./client.js";

export {
  defaultCachePath,
  projectCachePath,
  readCache,
  writeCache,
  isCacheFresh,
} from "./cache.js";

export { bundledRegistryFixturePath } from "./fixtures.js";

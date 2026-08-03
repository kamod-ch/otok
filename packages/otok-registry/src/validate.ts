import { createHash } from "node:crypto";
import {
  ExtensionEntrySchema,
  RegistryBundleSchema,
  RegistryIndexSchema,
  type ExtensionEntry,
  type LoadedRegistry,
  type Publisher,
  type RegistryBundle,
  type RegistryIndex,
} from "./schema.js";

export function sha256Checksum(content: string): string {
  return `sha256:${createHash("sha256").update(content, "utf8").digest("hex")}`;
}

export function validateRegistryIndex(data: unknown): RegistryIndex {
  return RegistryIndexSchema.parse(data);
}

export function validateRegistryBundle(data: unknown): RegistryBundle {
  return RegistryBundleSchema.parse(data);
}

export function validateExtensionEntry(data: unknown): ExtensionEntry {
  return ExtensionEntrySchema.parse(data);
}

export function verifyBundleChecksum(bundleJson: string, expectedChecksum: string): boolean {
  return sha256Checksum(bundleJson) === expectedChecksum;
}

export function indexRegistry(
  index: RegistryIndex,
  bundle: RegistryBundle,
): LoadedRegistry {
  const publishersById = new Map<string, Publisher>();
  for (const publisher of index.publishers) {
    publishersById.set(publisher.id, publisher);
  }

  const extensionsByName = new Map<string, ExtensionEntry>();
  for (const ext of bundle.extensions) {
    extensionsByName.set(ext.name, ext);
    for (const alias of ext.aliases) {
      extensionsByName.set(alias, ext);
    }
  }

  return {
    ...index,
    ...bundle,
    publishersById,
    extensionsByName,
  };
}

export function assertVerifiedPublisher(entry: ExtensionEntry, registry: LoadedRegistry): boolean {
  const publisher = registry.publishersById.get(entry.publisher);
  return Boolean(publisher?.verified);
}

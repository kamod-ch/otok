import type { ExtensionEntry, LoadedRegistry, RegistrySearchQuery } from "./schema.js";
import { satisfiesRange } from "./semver.js";

export function searchExtensions(
  registry: LoadedRegistry,
  query: RegistrySearchQuery = {},
): ExtensionEntry[] {
  const unique = new Map<string, ExtensionEntry>();
  for (const ext of registry.extensions) {
    unique.set(ext.name, ext);
  }

  let results = [...unique.values()];

  if (query.q) {
    const q = query.q.toLowerCase();
    results = results.filter(
      (ext) =>
        ext.name.toLowerCase().includes(q) ||
        ext.description.toLowerCase().includes(q) ||
        ext.keywords.some((k) => k.toLowerCase().includes(q)) ||
        ext.aliases.some((a) => a.toLowerCase().includes(q)),
    );
  }

  if (query.tier) results = results.filter((ext) => ext.tier === query.tier);
  if (query.runtime) results = results.filter((ext) => ext.runtime.includes(query.runtime!));
  if (query.capability) {
    results = results.filter((ext) => ext.capabilities.includes(query.capability!));
  }
  if (query.deprecated !== undefined) {
    results = results.filter((ext) => ext.deprecated === query.deprecated);
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveExtension(registry: LoadedRegistry, input: string): ExtensionEntry | undefined {
  const trimmed = input.trim();
  return (
    registry.extensionsByName.get(trimmed) ??
    registry.extensionsByName.get(`@kamod-ch/${trimmed}`) ??
    registry.extensionsByName.get(`@kamod-ch/otok-${trimmed}`) ??
    // Legacy @otok/* package names (pre kamod-ch scope migration)
    registry.extensionsByName.get(`@otok/${trimmed}`)
  );
}

export function formatExtensionDetail(entry: ExtensionEntry, registry: LoadedRegistry): string {
  const publisher = registry.publishersById.get(entry.publisher);
  const lines = [
    `${entry.name}@${entry.version}`,
    entry.description,
    "",
    `Publisher:    ${publisher?.name ?? entry.publisher}${publisher?.verified ? " (verified)" : ""}`,
    `Tier:         ${entry.tier}`,
    `Otok:         ${entry.otokVersion}`,
    `Runtime:      ${entry.runtime.join(", ")}`,
    `Adapters:     ${entry.adapters.join(", ")}`,
    `Maintenance:  ${entry.maintenanceStatus}`,
    `Quality:      ${entry.qualityStatus}`,
    `License:      ${entry.license}`,
    `Published:    ${entry.publishedAt.slice(0, 10)}`,
  ];

  if (entry.capabilities.length) lines.push(`Capabilities: ${entry.capabilities.join(", ")}`);
  if (entry.docs) lines.push(`Docs:         ${entry.docs}`);
  if (entry.repository) lines.push(`Repository:   ${entry.repository}`);
  if (entry.deprecated) {
    lines.push("", `DEPRECATED: ${entry.deprecationMessage ?? "Use successor package."}`);
    if (entry.successor) lines.push(`Successor:    ${entry.successor}`);
  }
  if (entry.securityNotes.length) {
    lines.push("", "Security notes:");
    for (const note of entry.securityNotes) lines.push(`  - ${note}`);
  }

  return lines.join("\n");
}

export { satisfiesRange };

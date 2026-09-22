import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const VALID_CLASSIFICATIONS = new Set(["public", "experimental", "internal"]);

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function normalizeExports(pkg) {
  const exportsMap = pkg.exports ?? (pkg.main ? { ".": pkg.main } : {});
  return typeof exportsMap === "string" ? { ".": exportsMap } : exportsMap;
}

export function resolveTypesPath(pkgDir, exportEntry) {
  const spec = typeof exportEntry === "string" ? { default: exportEntry } : exportEntry;
  const types = spec.types ?? spec.import?.types;
  if (!types || typeof types !== "string") return null;
  return join(pkgDir, types);
}

/** Collect exported declaration names from a .d.ts file (review aid, not full TS semantics). */
export function collectTypeSurface(dtsPath) {
  if (!dtsPath || !existsSync(dtsPath)) return [];
  const text = readFileSync(dtsPath, "utf8");
  const names = new Set();

  for (const match of text.matchAll(/export\s+declare\s+(?:function|class|const|enum)\s+(\w+)/g)) {
    names.add(match[1]);
  }
  for (const match of text.matchAll(/export\s+(?:type|interface)\s+(\w+)/g)) {
    names.add(match[1]);
  }
  for (const match of text.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const segment of match[1].split(",")) {
      const cleaned = segment
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)[0]
        .trim();
      if (cleaned && cleaned !== "default") names.add(cleaned);
    }
  }

  return [...names].sort();
}

export function scanPackageSurface(pkgDir, pkg, manifestEntry) {
  const exportsMap = normalizeExports(pkg);
  const surfaces = {};

  for (const [subpath, exportEntry] of Object.entries(exportsMap)) {
    const classification = manifestEntry?.exports?.[subpath];
    if (!classification || !VALID_CLASSIFICATIONS.has(classification)) continue;
    if (classification === "internal") continue;

    const typesPath = resolveTypesPath(pkgDir, exportEntry);
    surfaces[subpath] = {
      classification,
      typesFile: typesPath ? typesPath.replace(pkgDir + "/", "") : null,
      exports: collectTypeSurface(typesPath),
    };
  }

  return surfaces;
}

export function diffSurfaces(baseline, current) {
  const changes = [];
  const allSubpaths = new Set([...Object.keys(baseline ?? {}), ...Object.keys(current ?? {})]);

  for (const subpath of [...allSubpaths].sort()) {
    const b = baseline?.[subpath];
    const c = current?.[subpath];
    if (!b && c) {
      changes.push({ kind: "added-subpath", subpath });
      continue;
    }
    if (b && !c) {
      changes.push({ kind: "removed-subpath", subpath });
      continue;
    }
    const bSet = new Set(b.exports ?? []);
    const cSet = new Set(c.exports ?? []);
    for (const name of bSet) {
      if (!cSet.has(name)) changes.push({ kind: "removed-export", subpath, name });
    }
    for (const name of cSet) {
      if (!bSet.has(name)) changes.push({ kind: "added-export", subpath, name });
    }
  }

  return changes;
}

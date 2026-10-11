export const CORE_PACKAGE_NAME = "@kamod-ch/otok";

/** Legacy npm name; treated as an alias of {@link CORE_PACKAGE_NAME} when detected. */
export const LEGACY_CORE_PACKAGE_NAME = "otok";

export const VITE_PLUGIN_PACKAGE_NAME = "@kamod-ch/otok-vite-plugin";

export const CLI_PACKAGE_NAME = "otok-cli";

export const ADAPTER_PACKAGE_NAMES = ["otok-adapter-node", "otok-adapter-cloudflare", "otok-adapter-static"] as const;

export type AdapterPackageName = (typeof ADAPTER_PACKAGE_NAMES)[number];

/** Packages upgraded with `--core-only` (core, toolchain, adapters). */
export const CORE_UPGRADE_PACKAGE_NAMES = [
  CORE_PACKAGE_NAME,
  LEGACY_CORE_PACKAGE_NAME,
  VITE_PLUGIN_PACKAGE_NAME,
  CLI_PACKAGE_NAME,
  ...ADAPTER_PACKAGE_NAMES,
] as const;

const UNSUPPORTED_VERSION_PREFIXES = /^(workspace:|link:|file:|git\+|github:)/;

export function isUnsupportedVersionSpec(spec: string): boolean {
  return UNSUPPORTED_VERSION_PREFIXES.test(spec.trim());
}

export function parseInstalledVersion(spec?: string): string | undefined {
  if (!spec || isUnsupportedVersionSpec(spec)) return undefined;
  const cleaned = spec.trim().replace(/^[\^~>=<v]+/, "");
  const version = cleaned.split(/\s+/)[0];
  return version || undefined;
}

export function resolveInstalledCorePackage(deps: Record<string, string>): string | undefined {
  if (deps[CORE_PACKAGE_NAME]) return CORE_PACKAGE_NAME;
  if (deps[LEGACY_CORE_PACKAGE_NAME]) return LEGACY_CORE_PACKAGE_NAME;
  return undefined;
}

export function resolveOtokVersion(deps: Record<string, string>): string | undefined {
  const pkg = resolveInstalledCorePackage(deps);
  if (!pkg) return undefined;
  return parseInstalledVersion(deps[pkg]);
}

export function hasConflictingCorePackages(deps: Record<string, string>): boolean {
  return Boolean(deps[CORE_PACKAGE_NAME] && deps[LEGACY_CORE_PACKAGE_NAME]);
}

/** Compare semver cores; prerelease segments sort below the release. */
export function compareVersions(a: string, b: string): number {
  const parse = (value: string) => {
    const normalized = value.replace(/^v/, "");
    const [core, prerelease] = normalized.split("-");
    const parts = core.split(".").map((part) => Number.parseInt(part, 10) || 0);
    return { parts, prerelease };
  };

  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < 3; i++) {
    const diff = (left.parts[i] ?? 0) - (right.parts[i] ?? 0);
    if (diff !== 0) return diff;
  }
  if (left.prerelease && !right.prerelease) return -1;
  if (!left.prerelease && right.prerelease) return 1;
  if (left.prerelease && right.prerelease) {
    return left.prerelease.localeCompare(right.prerelease);
  }
  return 0;
}

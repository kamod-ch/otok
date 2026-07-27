import { resolve, relative, normalize, isAbsolute } from "node:path";

const APPEND_ALLOWED_FILES = new Set([".env.example", ".env.local.example"]);
const CREATE_ALLOWED_PREFIXES = ["config/", "src/config/", "migrations/"] as const;

export interface PluginSetupContext {
  root: string;
  packageName: string;
  dryRun: boolean;
}

export interface PluginSetupAppendFile {
  kind: "append-file";
  /** Project-relative path. Only `.env.example` and similar are allowed. */
  path: string;
  content: string;
}

export interface PluginSetupCreateFile {
  kind: "create-file";
  /** Project-relative path under allowed prefixes, or `.env.example`. */
  path: string;
  content: string;
}

export interface PluginSetupMkdir {
  kind: "mkdir";
  path: string;
}

export interface PluginSetupTsconfigTypes {
  kind: "tsconfig-types";
  types: string[];
}

export type PluginSetupChange =
  | PluginSetupAppendFile
  | PluginSetupCreateFile
  | PluginSetupMkdir
  | PluginSetupTsconfigTypes;

export interface PluginSetupResult {
  changes?: PluginSetupChange[];
}

export type PluginSetupHook = (context: PluginSetupContext) => PluginSetupResult | Promise<PluginSetupResult>;

export function defineSetup(hook: PluginSetupHook): PluginSetupHook {
  return hook;
}

export class PluginSetupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PluginSetupValidationError";
  }
}

function assertRelativePath(root: string, filePath: string): string {
  if (isAbsolute(filePath)) {
    throw new PluginSetupValidationError(`Setup path must be relative: ${filePath}`);
  }

  const normalized = normalize(filePath).replace(/\\/g, "/");
  if (normalized.startsWith("../") || normalized === "..") {
    throw new PluginSetupValidationError(`Setup path must stay inside the project: ${filePath}`);
  }

  const absolute = resolve(root, normalized);
  const rel = relative(root, absolute);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new PluginSetupValidationError(`Setup path escapes project root: ${filePath}`);
  }

  return normalized;
}

function isAppendAllowed(relativePath: string): boolean {
  const base = relativePath.split("/").pop() ?? relativePath;
  return APPEND_ALLOWED_FILES.has(base);
}

function isCreateAllowed(relativePath: string): boolean {
  if (isAppendAllowed(relativePath)) return true;
  return CREATE_ALLOWED_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

export function validateSetupChanges(root: string, changes: PluginSetupChange[]): PluginSetupChange[] {
  return changes.map((change) => {
    switch (change.kind) {
      case "append-file": {
        const path = assertRelativePath(root, change.path);
        if (!isAppendAllowed(path)) {
          throw new PluginSetupValidationError(
            `Setup append is only allowed for env example files, not "${path}"`,
          );
        }
        return { ...change, path };
      }
      case "create-file": {
        const path = assertRelativePath(root, change.path);
        if (!isCreateAllowed(path)) {
          throw new PluginSetupValidationError(
            `Setup create is not allowed for "${path}". Use config/, src/config/, migrations/, or .env.example`,
          );
        }
        return { ...change, path };
      }
      case "mkdir": {
        const path = assertRelativePath(root, change.path);
        return { ...change, path };
      }
      case "tsconfig-types":
        return change;
      default: {
        const unknown = change as PluginSetupChange;
        throw new PluginSetupValidationError(`Unknown setup change kind: ${(unknown as { kind?: string }).kind}`);
      }
    }
  });
}

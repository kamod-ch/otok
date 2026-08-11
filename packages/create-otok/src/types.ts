export type ProjectVariant =
  | "minimal"
  | "content"
  | "saas"
  | "dashboard"
  | "api"
  | "kamod"
  | "crm";

export type AdapterTarget = "node" | "cloudflare" | "static";

export interface ScaffoldOptions {
  name: string;
  targetDir: string;
  variant: ProjectVariant;
  typescript: boolean;
  kamodUi: boolean;
  auth: boolean;
  i18n: boolean;
  kysely: boolean;
  database: "sqlite" | "postgres" | "none";
  validation: boolean;
  testing: boolean;
  docker: boolean;
  githubActions: boolean;
  aiJson: boolean;
  adapter: AdapterTarget;
  install: boolean;
  git: boolean;
  force: boolean;
  yes: boolean;
  dryRun: boolean;
  smoke: boolean;
  preset?: string;
  layers: string[];
  /** Additional business kits to compose (e.g. @kamod-ch/otok-kit-admin). */
  kits?: string[];
  /** Enabled module ids per kit name. */
  kitModules?: Record<string, readonly string[]>;
  /** Local file overrides — destination → absolute source path. */
  kitOverrides?: import("@kamod-ch/otok-config").PresetFileEntry[];
}

export interface VersionMatrix extends Record<string, string> {
  generatedAt: string;
  otok: string;
  "@kamod-ch/otok-vite-plugin": string;
}

export interface ScaffoldResult {
  targetDir: string;
  packageName: string;
  variant: ProjectVariant;
  presetChain: string[];
  kitsApplied: string[];
  filesWritten: string[];
}

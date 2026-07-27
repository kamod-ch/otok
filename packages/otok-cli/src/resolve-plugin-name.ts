/** Official short-name aliases → published npm package names. */
export const OFFICIAL_PLUGIN_ALIASES: Record<string, string> = {
  oauth: "@kamod-ch/otok-oauth",
  i18n: "@kamod-ch/otok-i18n",
  kysely: "@kamod-ch/otok-kysely",
  seo: "@kamod-ch/otok-seo",
  security: "@kamod-ch/otok-security",
  observability: "@kamod-ch/otok-observability",
  kamod: "@kamod-ch/otok-kamod",
  auth: "@kamod-ch/otok-auth",
  validate: "@kamod-ch/otok-validate",
  validation: "@kamod-ch/otok-validation",
  flash: "@kamod-ch/otok-flash",
  stripe: "@kamod-ch/otok-stripe",
  mail: "@kamod-ch/otok-mail",
  storage: "@kamod-ch/otok-storage",
  queue: "@kamod-ch/otok-queue",
};

const SCOPED_PACKAGE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

export class PluginNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PluginNameError";
  }
}

export function resolvePluginPackageName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new PluginNameError("Plugin name is required.");
  }

  const alias = OFFICIAL_PLUGIN_ALIASES[trimmed];
  if (alias) return alias;

  if (trimmed.startsWith("@")) {
    if (!SCOPED_PACKAGE.test(trimmed)) {
      throw new PluginNameError(`Invalid package name "${trimmed}".`);
    }
    return trimmed;
  }

  if (trimmed.startsWith("otok-")) {
    return `@kamod-ch/${trimmed}`;
  }

  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    throw new PluginNameError(`Invalid plugin name "${trimmed}".`);
  }

  throw new PluginNameError(
    `Unknown plugin "${trimmed}". Use a full package name (e.g. @scope/my-plugin) or an official alias: ${Object.keys(OFFICIAL_PLUGIN_ALIASES).join(", ")}.`,
  );
}

export function pluginImportIdentifier(packageName: string): string {
  const segment = packageName.includes("/") ? packageName.split("/").pop()! : packageName;
  let base = segment.replace(/^otok-plugin-/, "").replace(/^plugin-/, "").replace(/^otok-/, "");
  if (!base) base = segment;

  const parts = base.split("-").filter(Boolean);
  const [first, ...rest] = parts;
  if (!first) return "plugin";

  const camel =
    first +
    rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");

  if (/^\d/.test(camel)) {
    return `plugin${camel.charAt(0).toUpperCase()}${camel.slice(1)}`;
  }

  return camel;
}

export function uniqueImportIdentifier(base: string, used: Set<string>): string {
  if (!used.has(base)) return base;

  let index = 2;
  while (used.has(`${base}${index}`)) index += 1;
  return `${base}${index}`;
}

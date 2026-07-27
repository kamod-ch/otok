import type { RobotsConfig } from "./types.js";

export interface RenderRobotsOptions {
  config?: boolean | RobotsConfig;
  origin?: string;
  sitemapPath?: string;
}

/** Render a robots.txt document from plugin options. */
export function renderRobotsTxt(options: RenderRobotsOptions = {}): string {
  const { config = true, origin, sitemapPath = "/sitemap.xml" } = options;
  if (config === false) return "User-agent: *\nDisallow: /";

  const rules = typeof config === "object" ? config : {};
  const lines: string[] = ["User-agent: *"];

  for (const path of rules.allow ?? ["/"]) {
    lines.push(`Allow: ${path}`);
  }
  for (const path of rules.disallow ?? []) {
    lines.push(`Disallow: ${path}`);
  }

  const sitemap = rules.sitemap ?? (origin ? `${origin.replace(/\/$/, "")}${sitemapPath}` : undefined);
  if (sitemap) lines.push("", `Sitemap: ${sitemap}`);
  if (rules.host) lines.push(`Host: ${rules.host}`);

  return `${lines.join("\n")}\n`;
}

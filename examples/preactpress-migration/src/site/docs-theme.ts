import { mapThemeConfig } from "@kamod-ch/preactpress-compat";
import { preactPressThemeConfig } from "./theme-config.js";

export const docsTheme = mapThemeConfig(preactPressThemeConfig);
export const siteOrigin = process.env.SITE_URL ?? "http://localhost:5173";
export const siteTitle = "PreactPress on Otok";

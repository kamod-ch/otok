import type { PreactPressThemeConfig } from "@kamod-ch/preactpress-compat";

/** Legacy-style PreactPress themeConfig — mapped via @kamod-ch/preactpress-compat. */
export const preactPressThemeConfig: PreactPressThemeConfig = {
  search: true,
  outline: true,
  footer: "Built with PreactPress on Otok.",
  nav: [
    { text: "Guide", link: "/docs/getting-started" },
    { text: "Examples", link: "/docs/markdown-examples" },
  ],
  sidebar: [
    {
      text: "Introduction",
      items: [
        { text: "Overview", link: "/docs/index" },
        { text: "Getting started", link: "/docs/getting-started" },
        { text: "Markdown examples", link: "/docs/markdown-examples" },
      ],
    },
    {
      text: "i18n",
      items: [{ text: "Deutsch", link: "/de/docs/getting-started" }],
    },
    {
      text: "Versions",
      items: [
        { text: "v1 (current)", link: "/docs/getting-started" },
        { text: "v2 overview", link: "/docs/v2-overview" },
      ],
    },
  ],
  socialLinks: [
    {
      icon: "github",
      link: "https://github.com/kamod-ch/preactpress",
      ariaLabel: "PreactPress on GitHub",
    },
  ],
};

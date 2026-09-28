import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@kamod-ch/preactpress/config";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(configDir, "..");
const preactpressPackage = path.resolve(docsRoot, "node_modules/@kamod-ch/preactpress");
const preactpressClient = path.join(preactpressPackage, "src/client");
const preactpressTheme = path.join(preactpressClient, "theme-default");

export default defineConfig({
  theme: "./theme/Layout.tsx",
  vite: {
    resolve: {
      alias: [
        { find: "@preactpress-internal/client", replacement: preactpressClient },
        { find: "@preactpress-internal/theme-default", replacement: preactpressTheme },
      ],
    },
  },
  srcDir: "content",
  site: {
    title: "Otok Docs",
    description:
      "Lightweight Hono + Preact framework for server-rendered applications with islands, progressive enhancement, and minimal client JavaScript.",
    url: "https://kamod-ch.github.io",
    base: "/otok/",
    lang: "en",
  },
  favicon: {
    svg: "/favicon.svg",
  },
  head: [
    ["link", { rel: "stylesheet", href: "/otok/theme.css" }],
    ["link", { rel: "stylesheet", href: "/otok/styles/logo.css" }],
  ],
  ai: {
    llmsTxt: true,
    llmsFullTxt: true,
    copyMarkdown: true,
    contextIndex: true,
  },
  themeConfig: {
    logo: {
      light: "/logo-wordmark.svg",
      dark: "/logo-wordmark-dark.svg",
    },
    outline: true,
    search: true,
    lastUpdated: true,
    footer: "Built with PreactPress.",
    editLink: {
      pattern: "https://github.com/kamod-ch/otok/edit/main/apps/docs/content/:path",
      text: "Edit this page on GitHub",
    },
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/kamod-ch/otok",
        ariaLabel: "Otok on GitHub",
      },
    ],
    nav: [
      { text: "Guide", link: "/core-concepts/routing" },
      { text: "API", link: "/reference/api" },
      { text: "Migration", link: "/migration/comparison" },
      { text: "Roadmap", link: "/project/roadmap" },
    ],
    sidebar: [
      {
        text: "Introduction",
        items: [{ text: "What is Otok?", link: "/" }],
      },
      {
        text: "Core concepts",
        items: [
          { text: "File-based Routing", link: "/core-concepts/routing" },
          { text: "Server Rendering", link: "/core-concepts/server-rendering" },
          { text: "Loaders, Actions, and Forms", link: "/core-concepts/loaders-actions-forms" },
          { text: "Route Middleware", link: "/core-concepts/middleware" },
          { text: "Islands and Soft Navigation", link: "/core-concepts/islands-soft-navigation" },
          { text: "Error Handling", link: "/core-concepts/errors" },
        ],
      },
      {
        text: "Guides",
        items: [
          { text: "Plugins", link: "/guides/plugins" },
          { text: "Create Your First Plugin", link: "/guides/create-your-first-plugin" },
          { text: "Plugin Setup Hooks", link: "/guides/plugin-setup-hooks" },
          { text: "CLI — otok add", link: "/guides/cli-add" },
          { text: "Composition Packages", link: "/guides/extensions" },
          { text: "Typed Route Modules", link: "/guides/typed-route-modules" },
          { text: "Rendering and Caching", link: "/guides/rendering-and-caching" },
          { text: "Validation", link: "/guides/validation" },
          { text: "Internationalization", link: "/guides/i18n" },
          { text: "Testing", link: "/guides/testing" },
          { text: "Devtools", link: "/guides/devtools" },
          { text: "Kamod Integration", link: "/guides/kamod" },
          { text: "Auth, CRUD, Styling, and Uploads", link: "/guides/auth-crud-styling" },
          { text: "Kysely", link: "/guides/kysely" },
          { text: "Mail", link: "/guides/otok-mail" },
          { text: "Queue", link: "/guides/otok-queue" },
          { text: "Storage", link: "/guides/otok-storage" },
          { text: "Stripe", link: "/guides/otok-stripe-plugin" },
          { text: "SEO, Security & Observability", link: "/guides/seo-security-observability" },
          { text: "Deployment Adapters", link: "/guides/adapters" },
          { text: "Deployment", link: "/guides/deployment" },
        ],
      },
      {
        text: "Migration",
        items: [
          { text: "Comparison", link: "/migration/comparison" },
          { text: "From Hono", link: "/migration/from-hono" },
          { text: "From Fresh", link: "/migration/from-fresh" },
          { text: "From Remix", link: "/migration/from-remix" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "API Reference", link: "/reference/api" },
          { text: "Built with Otok", link: "/showcase/built-with-otok" },
          { text: "Project Roadmap", link: "/project/roadmap" },
        ],
      },
    ],
  },
  build: {
    sitemap: true,
    robots: true,
  },
});

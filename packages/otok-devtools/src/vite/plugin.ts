import type { Plugin } from "vite";

export interface DevtoolsVitePluginOptions {
  endpoint: string;
  panel: boolean;
}

const CLIENT_ENTRY = "\0otok-devtools/client";

export function createDevtoolsVitePlugin(options: DevtoolsVitePluginOptions): Plugin {
  return {
    name: "otok-devtools:vite",
    apply: "serve",
    resolveId(id) {
      if (id === "virtual:otok-devtools/client") return CLIENT_ENTRY;
      return undefined;
    },
    load(id) {
      if (id !== CLIENT_ENTRY) return undefined;
      if (!options.panel) {
        return "export function mountDevtoolsPanel() {}";
      }
      return `
        import { mountDevtoolsPanel } from "@kamod-ch/otok-devtools/client";
        if (import.meta.env.DEV) {
          mountDevtoolsPanel(${JSON.stringify({ endpoint: options.endpoint })});
        }
      `;
    },
    transformIndexHtml() {
      if (!options.panel) return [];
      return [
        {
          tag: "script",
          attrs: { type: "module", src: "/@id/virtual:otok-devtools/client" },
          injectTo: "body",
        },
      ];
    },
  };
}

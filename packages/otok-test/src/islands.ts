import { decodeIslandProps } from "@kamod-ch/otok/shared";
import type { ParsedHtml } from "./html.js";

export interface ParsedIsland {
  id: string;
  strategy: string;
  media: string | null;
  propsId: string | null;
  props: Record<string, unknown>;
  hydrated: boolean;
  outerHTML: string;
}

export function getIslands(document: ParsedHtml): ParsedIsland[] {
  const elements = document.querySelectorAll("[data-otok-island]");
  return elements.map((element) => {
    const id = element.getAttribute("data-otok-island") ?? "";
    const propsId = element.getAttribute("data-otok-props-id");
    let props: Record<string, unknown> = {};
    const encoded = element.getAttribute("data-otok-props");
    if (encoded) {
      try {
        props = decodeIslandProps(encoded) as Record<string, unknown>;
      } catch {
        props = {};
      }
    } else if (propsId) {
      const script = document.querySelector(`script[type="application/json"][data-otok-props-for="${propsId}"]`);
      if (script?.textContent) {
        props = JSON.parse(script.textContent) as Record<string, unknown>;
      }
    }

    return {
      id,
      strategy: element.getAttribute("data-otok-strategy") ?? "load",
      media: element.getAttribute("data-otok-media"),
      propsId,
      props,
      hydrated: element.getAttribute("data-otok-hydrated") === "true",
      outerHTML: element.outerHTML,
    };
  });
}

export interface ExpectIslandOptions {
  strategy?: string;
  props?: Record<string, unknown>;
  hydrated?: boolean;
}

export function expectIsland(document: ParsedHtml, id: string, options: ExpectIslandOptions = {}): ParsedIsland {
  const islands = getIslands(document).filter((island) => island.id === id);
  if (islands.length === 0) {
    throw new Error(`Expected island "${id}" in HTML but none was found.`);
  }

  const island = islands[0];
  if (options.strategy && island.strategy !== options.strategy) {
    throw new Error(`Expected island "${id}" strategy "${options.strategy}" but received "${island.strategy}".`);
  }
  if (options.hydrated !== undefined && island.hydrated !== options.hydrated) {
    throw new Error(`Expected island "${id}" hydrated=${options.hydrated} but received ${island.hydrated}.`);
  }
  if (options.props) {
    for (const [key, value] of Object.entries(options.props)) {
      if (JSON.stringify(island.props[key]) !== JSON.stringify(value)) {
        throw new Error(`Expected island "${id}" prop "${key}" to equal ${JSON.stringify(value)}.`);
      }
    }
  }

  return island;
}

export function expectSsrPageMarker(document: ParsedHtml): void {
  if (!document.querySelector(`[data-otok-page]`)) {
    throw new Error("Expected SSR page marker [data-otok-page] in HTML.");
  }
}

export function expectClientEntry(document: ParsedHtml): void {
  const scripts = document.querySelectorAll("script[type=module]");
  if (scripts.length === 0) {
    throw new Error("Expected at least one module script (client entry) in HTML.");
  }
}

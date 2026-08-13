// @vitest-environment jsdom
import { hydrateIslands, softNavigate, type IslandRegistry } from "@kamod-ch/otok/client";
import type { OtokTestApp } from "./app.js";

export interface HydrationTestResult {
  document: Document;
  errors: unknown[];
}

/** Mount SSR HTML into jsdom and hydrate registered islands. */
export async function hydrateTestPage(html: string, registry: IslandRegistry): Promise<HydrationTestResult> {
  document.documentElement.innerHTML = html;
  const errors: unknown[] = [];
  await hydrateIslands(document, registry, (error) => {
    errors.push(error);
  });
  return { document, errors };
}

export interface SoftNavigationTestResult {
  document: Document;
  responseStatus: number;
  url: string;
  errors: unknown[];
  applied: boolean;
}

/** Simulate soft navigation against a test app using jsdom and otok/client helpers. */
export async function softNavigateTestPage(
  app: OtokTestApp,
  fromHtml: string,
  href: string,
  registry: IslandRegistry,
): Promise<SoftNavigationTestResult> {
  document.documentElement.innerHTML = fromHtml;

  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const parsed = new URL(url, "http://localhost");
    const response = await app.get(`${parsed.pathname}${parsed.search}`);
    const html = await response.text();
    return new Response(html, {
      status: response.status,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  };

  const errors: unknown[] = [];
  let applied = false;
  try {
    applied = await softNavigate(href, registry, {
      history: false,
      scroll: false,
      onError: (error) => errors.push(error),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  const parsed = new URL(href, "http://localhost");
  const probe = await app.get(`${parsed.pathname}${parsed.search}`);

  return {
    document,
    responseStatus: probe.status,
    url: `${parsed.pathname}${parsed.search}`,
    errors,
    applied,
  };
}

export function expectHydrated(element: Element): void {
  if (element.getAttribute("data-otok-hydrated") !== "true") {
    throw new Error(`Expected island "${element.getAttribute("data-otok-island") ?? ""}" to be hydrated.`);
  }
}

export function expectHydrationErrors(errors: unknown[], expectedCount = 0): void {
  if (errors.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} hydration errors but received ${errors.length}.`);
  }
}

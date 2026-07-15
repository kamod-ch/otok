// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { OTOK_HEAD_ATTR, OTOK_PAGE_ATTR, OTOK_SWAP_ATTR } from "../shared/navigation.js";
import { applySoftNavigationDocument, isSoftNavForm, isSoftNavLink, syncSoftNavigationHead } from "./soft-nav.js";

function renderDoc(body: string, title = "Page", headExtra = ""): Document {
  const html = `<!doctype html><html><head><title ${OTOK_HEAD_ATTR}="title">${title}</title>${headExtra}</head><body>${body}</body></html>`;
  return new DOMParser().parseFromString(html, "text/html");
}

describe("isSoftNavLink", () => {
  it("accepts same-origin path links", () => {
    const anchor = document.createElement("a");
    anchor.href = "http://localhost/documents";
    const location = new URL("http://localhost/dashboard") as unknown as Location;
    expect(isSoftNavLink(anchor, location)).toBe(true);
  });

  it("rejects external, hash-only, download, and api links", () => {
    const external = document.createElement("a");
    external.href = "https://example.com/about";
    expect(isSoftNavLink(external, { href: "http://localhost/" } as Location)).toBe(false);

    const hash = document.createElement("a");
    hash.href = "#section";
    expect(isSoftNavLink(hash, { href: "http://localhost/" } as Location)).toBe(false);

    const download = document.createElement("a");
    download.href = "/api/file";
    download.setAttribute("download", "");
    expect(isSoftNavLink(download, { href: "http://localhost/" } as Location)).toBe(false);

    const api = document.createElement("a");
    api.href = "http://localhost/api/documents/1/download";
    expect(isSoftNavLink(api, new URL("http://localhost/") as unknown as Location)).toBe(false);
  });
});

describe("isSoftNavForm", () => {
  it("accepts same-origin get and post forms", () => {
    const form = document.createElement("form");
    form.action = "http://localhost/projects";
    form.method = "post";
    expect(isSoftNavForm(form, undefined, new URL("http://localhost/") as unknown as Location)).toBe(true);
  });

  it("rejects opt-out, external, api, and unsupported method forms", () => {
    const location = new URL("http://localhost/") as unknown as Location;

    const optOut = document.createElement("form");
    optOut.action = "http://localhost/projects";
    optOut.setAttribute("data-otok-no-nav", "");
    expect(isSoftNavForm(optOut, undefined, location)).toBe(false);

    const external = document.createElement("form");
    external.action = "https://example.com/projects";
    expect(isSoftNavForm(external, undefined, location)).toBe(false);

    const api = document.createElement("form");
    api.action = "http://localhost/api/projects";
    expect(isSoftNavForm(api, undefined, location)).toBe(false);

    const dialog = document.createElement("form");
    dialog.action = "http://localhost/projects";
    dialog.method = "dialog";
    expect(isSoftNavForm(dialog, undefined, location)).toBe(false);
  });
});

describe("syncSoftNavigationHead", () => {
  it("syncs managed meta tags and title", () => {
    document.head.innerHTML = `<title ${OTOK_HEAD_ATTR}="title">Old</title><meta ${OTOK_HEAD_ATTR}="description" name="description" content="Old desc">`;
    document.title = "Old";

    const next = renderDoc(
      "",
      "New",
      `<meta ${OTOK_HEAD_ATTR}="description" name="description" content="New desc">`,
    );

    syncSoftNavigationHead(next);
    expect(document.title).toBe("New");
    expect(document.querySelector(`meta[${OTOK_HEAD_ATTR}="description"]`)?.getAttribute("content")).toBe(
      "New desc",
    );
  });
});

describe("applySoftNavigationDocument", () => {
  it("swaps page and keyed layout regions", () => {
    const current = renderDoc(`
      <nav ${OTOK_SWAP_ATTR}="sidebar-nav"><a href="/dashboard" class="active">Dashboard</a></nav>
      <header ${OTOK_SWAP_ATTR}="topbar"><h1>Dashboard</h1></header>
      <div ${OTOK_PAGE_ATTR}><p>Old page</p></div>
    `);
    document.body.innerHTML = current.body.innerHTML;
    document.title = "Dashboard";

    const next = renderDoc(
      `
      <nav ${OTOK_SWAP_ATTR}="sidebar-nav"><a href="/documents" class="active">Belege</a></nav>
      <header ${OTOK_SWAP_ATTR}="topbar"><h1>Belege</h1></header>
      <div ${OTOK_PAGE_ATTR}><p>New page</p></div>
    `,
      "Belege",
    );

    expect(applySoftNavigationDocument(next)).toBe(true);
    expect(document.querySelector(`[${OTOK_PAGE_ATTR}]`)?.textContent).toContain("New page");
    expect(document.querySelector(`[${OTOK_SWAP_ATTR}="topbar"]`)?.textContent).toContain("Belege");
    expect(document.querySelector(`[${OTOK_SWAP_ATTR}="sidebar-nav"] a.active`)?.getAttribute("href")).toBe(
      "/documents",
    );
    expect(document.title).toBe("Belege");
  });

  it("returns false when the fetched document has no page region", () => {
    const current = renderDoc(`<div ${OTOK_PAGE_ATTR}><p>Current</p></div>`);
    document.body.innerHTML = current.body.innerHTML;
    const next = renderDoc(`<p>No page marker</p>`);
    expect(applySoftNavigationDocument(next)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import { Discussion } from "./Discussion.js";
import { discussionFixtureViewModels } from "./fixtures/view-models.js";

describe("discussion ui SSR", () => {
  it("renders full thread content and composer form for signed-in open state", () => {
    const html = renderToString(h(Discussion, { model: discussionFixtureViewModels.openSignedIn! }));
    expect(html).toContain('name="bodyMarkdown"');
    expect(html).toContain('name="intent"');
    expect(html).toContain("Supercalifragilisticexpialidocious");
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain("data-otok-island");
  });

  it("renders login prompt for guests without composer fields", () => {
    const html = renderToString(h(Discussion, { model: discussionFixtureViewModels.openGuest! }));
    expect(html).toContain("Alle Kommentare anzeigen");
    expect(html).not.toContain('name="bodyMarkdown"');
    expect(html).toContain("/login");
  });

  it("renders moderated placeholder copy", () => {
    const html = renderToString(h(Discussion, { model: discussionFixtureViewModels.moderatedPlaceholder! }));
    expect(html).toContain("Dieser Beitrag wurde entfernt");
  });

  it("exposes accessible reaction labels", () => {
    const html = renderToString(h(Discussion, { model: discussionFixtureViewModels.openSignedIn! }));
    expect(html).toContain("Zustimmen");
    expect(html).toContain("Ablehnen");
  });

  it("renders loading state with polite status", () => {
    const html = renderToString(h(Discussion, { model: discussionFixtureViewModels.loading! }));
    expect(html).toContain('aria-busy="true"');
  });
});

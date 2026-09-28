import { describe, expect, it } from "vitest";
import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import { Discussion } from "./Discussion.js";
import { createDiscussionsI18n } from "../i18n/create.js";
import { discussionLabelsFromI18n } from "../i18n/labels.js";
import { discussionFixtureViewModels } from "./fixtures/view-models.js";

describe("discussion a11y markup", () => {
  it("renders skip link and locale on region", () => {
    const html = renderToString(h(Discussion, { model: discussionFixtureViewModels.openSignedIn! }));
    expect(html).toContain('href="#discussion-region"');
    expect(html).toContain('id="discussion-region"');
    expect(html).toContain('role="list"');
    expect(html).toContain("aria-pressed=");
  });

  it("renders English labels when locale is en", () => {
    const labels = discussionLabelsFromI18n(createDiscussionsI18n({ locale: "en" }));
    const model = { ...discussionFixtureViewModels.openGuest!, locale: "en" as const, labels };
    const html = renderToString(h(Discussion, { model }));
    expect(html).toContain("Show all comments");
    expect(html).toContain('lang="en"');
  });

  it("associates composer errors with alert region", () => {
    const model = {
      ...discussionFixtureViewModels.openSignedIn!,
      fieldErrors: { bodyMarkdown: ["Required"] },
      formErrors: [],
    };
    const html = renderToString(h(Discussion, { model }));
    expect(html).toContain('role="alert"');
    expect(html).toContain("aria-invalid");
  });
});

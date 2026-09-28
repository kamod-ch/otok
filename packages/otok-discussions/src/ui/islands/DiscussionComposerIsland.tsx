import { useEffect, useRef } from "preact/hooks";
import { clearDiscussionDraft, readDiscussionDraft, writeDiscussionDraft } from "../browser/draft-storage.js";

import { createDiscussionsI18n, type DiscussionLocale } from "../../i18n/create.js";
import { discussionLabelsFromI18n } from "../../i18n/labels.js";

export interface DiscussionComposerIslandProps {
  textareaId?: string;
  draftScope?: string;
  maxLength?: number;
  /** Must match SSR `data-discussion-locale` on the section. */
  locale?: DiscussionLocale;
}

/**
 * Progressive enhancement: live character count + versioned local draft (untrusted).
 * SSR markup remains authoritative; successful POST should clear draft in host app or via full navigation.
 */
export default function DiscussionComposerIsland({
  textareaId = "discussion-composer-body",
  draftScope,
  maxLength = 10_000,
  locale = "de",
}: DiscussionComposerIslandProps) {
  const charCountLabel = discussionLabelsFromI18n(createDiscussionsI18n({ locale })).charCount;
  const mounted = useRef(false);

  useEffect(() => {
    const textarea = document.getElementById(textareaId);
    if (!(textarea instanceof HTMLTextAreaElement)) return;

    if (draftScope && !mounted.current) {
      const draft = readDiscussionDraft(draftScope);
      if (draft && !textarea.value) {
        textarea.value = draft.body.slice(0, maxLength);
      }
    }
    mounted.current = true;

    const counter = textarea.closest("form")?.querySelector<HTMLElement>("[data-discussion-char-count]");

    const sync = () => {
      const len = textarea.value.length;
      if (counter) {
        counter.textContent = charCountLabel(len, maxLength);
      }
      if (draftScope) {
        if (textarea.value.trim()) writeDiscussionDraft(draftScope, textarea.value);
        else clearDiscussionDraft(draftScope);
      }
    };

    sync();
    textarea.addEventListener("input", sync);
    const form = textarea.closest("form");
    const onSubmit = () => {
      if (draftScope) clearDiscussionDraft(draftScope);
    };
    form?.addEventListener("submit", onSubmit);

    const errorRegion = form?.querySelector<HTMLElement>("[data-discussion-composer-errors]");
    if (errorRegion?.querySelector("p")) {
      textarea.focus();
    }

    return () => {
      textarea.removeEventListener("input", sync);
      form?.removeEventListener("submit", onSubmit);
    };
  }, [textareaId, draftScope, maxLength, locale, charCountLabel]);

  return null;
}

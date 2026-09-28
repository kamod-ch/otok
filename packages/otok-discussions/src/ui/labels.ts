import { createDiscussionsI18n } from "../i18n/create.js";
import { discussionLabelsFromI18n } from "../i18n/labels.js";
import type { DiscussionLabels } from "./types.js";

export const defaultDiscussionLabels: DiscussionLabels = discussionLabelsFromI18n(
  createDiscussionsI18n({ locale: "de" }),
);

export function resolveDiscussionLabels(partial?: Partial<DiscussionLabels>): DiscussionLabels {
  return { ...defaultDiscussionLabels, ...partial };
}

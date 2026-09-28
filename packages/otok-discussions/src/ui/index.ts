export { Discussion } from "./Discussion.js";
export { DiscussionHeader } from "./DiscussionHeader.js";
export { DiscussionNotice } from "./DiscussionNotice.js";
export { LoginPrompt } from "./LoginPrompt.js";
export { CommentComposerShell } from "./CommentComposerShell.js";
export { TopCommentsPreview } from "./TopCommentsPreview.js";
export { CommentCard } from "./CommentCard.js";
export { AuthorMeta } from "./AuthorMeta.js";
export { CommentBody } from "./CommentBody.js";
export { CommentActions } from "./CommentActions.js";
export { ShowAllCommentsCta } from "./ShowAllCommentsCta.js";
export { DiscussionSortNav } from "./DiscussionSortNav.js";
export { CommentThreadList } from "./CommentThreadList.js";
export { ReportFormPanel } from "./ReportFormPanel.js";
export { discussionsThreadViewUrl, discussionsPermalinkUrl, discussionsRepliesUrl } from "./thread-url.js";
export { DiscussionLoading } from "./DiscussionLoading.js";
export { DiscussionFixturesPage } from "./DiscussionFixturesPage.js";

export { discussionViewModelFromPageData } from "./map-page-data.js";
export type { PluginDiscussionPageData } from "./map-page-data.js";
export { defaultDiscussionLabels, resolveDiscussionLabels } from "./labels.js";
export { DISCUSSION_UI_KAMOD_MAP } from "./kamod-map.js";
export { discussionFixtureKeys, discussionFixtureViewModels } from "./fixtures/view-models.js";

export type {
  DiscussionProps,
  DiscussionViewModel,
  DiscussionCommentView,
  DiscussionAuthorView,
  DiscussionLabels,
  DiscussionFormConfig,
  DiscussionShellState,
  DiscussionLayout,
} from "./types.js";

import {
  CategoryCard,
  CategoryList,
  ForumLayout,
  MarkdownPreview,
  ModerationQueue,
  NewThreadForm,
  Post,
  PostActions,
  PostComposer,
  PostList,
  ReportForm,
  SearchPage,
  ThreadHeader,
  ThreadList,
  ThreadListItem,
  ThreadPage,
} from "./default.js";
import { EmptyState, ForumError, Pagination, TagList, UserAvatar } from "./primitives.js";
import type { ForumComponentOverrides } from "../types.js";

export function createDefaultComponents(): Required<ForumComponentOverrides> {
  return {
    ForumLayout,
    CategoryList,
    CategoryCard,
    ThreadList,
    ThreadListItem,
    ThreadPage,
    ThreadHeader,
    PostList,
    Post,
    PostActions,
    PostComposer,
    MarkdownPreview,
    Pagination,
    TagList,
    UserAvatar,
    EmptyState,
    ForumError,
    ReportForm,
    ModerationQueue,
    SearchPage,
    NewThreadForm,
  };
}

export {
  CategoryCard,
  CategoryList,
  ForumLayout,
  MarkdownPreview,
  ModerationQueue,
  NewThreadForm,
  Post,
  PostActions,
  PostComposer,
  PostList,
  ReportForm,
  SearchPage,
  ThreadHeader,
  ThreadList,
  ThreadListItem,
  ThreadPage,
} from "./default.js";
export { EmptyState, ForumError, Pagination, TagList, UserAvatar } from "./primitives.js";

export { FORUM_THEME_CSS } from "./theme.js";

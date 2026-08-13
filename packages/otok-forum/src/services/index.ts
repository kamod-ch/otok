export { CategoryService } from "./categories.js";
export { ThreadService, ForumNotFoundError } from "./threads.js";
export { PostService, ForumClosedThreadError } from "./posts.js";
export { ReactionService } from "./reactions.js";
export { SubscriptionService, ReadStateService } from "./subscriptions.js";
export { ReportService, ModerationService } from "./reports.js";
export { SearchService, createKyselySearchAdapter } from "./search.js";

import type { ForumMarkdownAdapter, ForumSearchAdapter, ForumStorageAdapter } from "../types.js";
import { createDefaultMarkdownAdapter } from "../markdown.js";
import { CategoryService } from "./categories.js";
import { ThreadService } from "./threads.js";
import { PostService } from "./posts.js";
import { ReactionService } from "./reactions.js";
import { SubscriptionService, ReadStateService } from "./subscriptions.js";
import { ReportService, ModerationService } from "./reports.js";
import { SearchService, createKyselySearchAdapter } from "./search.js";
import type { ForumServices } from "../types.js";

export function createForumServices(
  storage: ForumStorageAdapter,
  options: { markdown?: ForumMarkdownAdapter; search?: ForumSearchAdapter } = {},
): ForumServices {
  const markdown = options.markdown ?? createDefaultMarkdownAdapter();
  const searchAdapter = options.search ?? createKyselySearchAdapter(storage);

  return {
    categories: new CategoryService(storage),
    threads: new ThreadService({ storage, markdown }),
    posts: new PostService({ storage, markdown }),
    reactions: new ReactionService(storage),
    subscriptions: new SubscriptionService(storage),
    readStates: new ReadStateService(storage),
    reports: new ReportService(storage),
    moderation: new ModerationService(storage),
    search: new SearchService(searchAdapter),
  };
}

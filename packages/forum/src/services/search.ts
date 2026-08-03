import { FORUM_PERMISSIONS } from "../permissions.js";
import type {
  ForumSearchAdapter,
  ForumSearchContext,
  ForumSearchQuery,
  ForumSearchResult,
  ForumStorageAdapter,
} from "../types.js";
import { offsetForPage, paginationMeta } from "../utils.js";

export function createKyselySearchAdapter(storage: ForumStorageAdapter): ForumSearchAdapter {
  return {
    async search(query: ForumSearchQuery, context: ForumSearchContext): Promise<ForumSearchResult> {
      if (!context.permissions.includes(FORUM_PERMISSIONS.CATEGORY_VIEW)) {
        return { hits: [], total: 0, page: query.page ?? 1, pageSize: query.pageSize ?? 20 };
      }

      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 20;
      const q = query.q.toLowerCase().trim();

      const categories = await storage.categories.list();
      const viewableCategoryIds = new Set(categories.map((c) => c.id));

      const hits: ForumSearchResult["hits"] = [];

      for (const category of categories) {
        if (query.categoryId && category.id !== query.categoryId) continue;
        if (!viewableCategoryIds.has(category.id)) continue;

        const threads = await storage.threads.listByCategory(category.id, {
          page: 1,
          pageSize: 500,
        });

        for (const thread of threads) {
          if (thread.deletedAt) continue;
          const titleMatch = thread.title.toLowerCase().includes(q);
          if (titleMatch) {
            hits.push({ type: "thread", thread, snippet: thread.title });
            continue;
          }

          const posts = await storage.posts.listByThread(thread.id, { pageSize: 100 });
          for (const post of posts) {
            if (post.deletedAt || post.isHidden) continue;
            if (post.contentMarkdown.toLowerCase().includes(q)) {
              hits.push({
                type: "post",
                thread,
                post,
                snippet: post.contentMarkdown.slice(0, 160),
              });
            }
          }
        }
      }

      const total = hits.length;
      const offset = offsetForPage(page, pageSize);
      const pageHits = hits.slice(offset, offset + pageSize);

      return { hits: pageHits, total, page, pageSize };
    },
  };
}

export class SearchService {
  constructor(private readonly adapter: ForumSearchAdapter) {}

  search(query: ForumSearchQuery, context: ForumSearchContext): Promise<ForumSearchResult> {
    return this.adapter.search(query, context);
  }

  pagination(query: ForumSearchQuery, total: number) {
    return paginationMeta(query.page ?? 1, query.pageSize ?? 20, total);
  }
}

import type { ForumCategory, ForumPageProps, ForumPost, ForumRuntimeContext, ForumThread } from "../types.js";
import { EmptyState, ForumError, Pagination, TagList, UserAvatar } from "./primitives.js";

export function ForumLayout({ data, children }: ForumPageProps & { children?: preact.ComponentChildren }) {
  const forum = data.forum as ForumRuntimeContext;
  return (
    <div class="otok-forum">
      <nav class="forum-nav" aria-label={forum.t("forum.title")}>
        <a href={forum.basePath}>{forum.t("forum.title")}</a>
        <a href={`${forum.basePath}/tags`}>{forum.t("forum.tags")}</a>
        <a href={`${forum.basePath}/search`}>{forum.t("forum.search")}</a>
        {forum.can("thread:create") ? (
          <a href={`${forum.basePath}/new`}>{forum.t("forum.newThread")}</a>
        ) : null}
        {forum.can("moderation:view") ? (
          <a href={`${forum.basePath}/moderation`}>{forum.t("forum.moderation")}</a>
        ) : null}
      </nav>
      {children ?? null}
    </div>
  );
}

export function CategoryCard({
  category,
  href,
}: {
  category: ForumCategory;
  href: string;
  forum: ForumRuntimeContext;
}) {
  return (
    <article class="forum-card">
      <h2 style={{ margin: "0 0 0.5rem" }}>
        <a href={href}>{category.name}</a>
      </h2>
      {category.description ? (
        <p style={{ color: "var(--forum-muted)", margin: "0 0 0.5rem" }}>{category.description}</p>
      ) : null}
      <p style={{ fontSize: "0.875rem", color: "var(--forum-muted)", margin: 0 }}>
        {category.threadCount} threads · {category.postCount} posts
      </p>
    </article>
  );
}

export function CategoryList({ data }: ForumPageProps) {
  const forum = data.forum as ForumRuntimeContext;
  const categories = (data.categories as ForumCategory[]) ?? [];
  if (!categories.length) return <EmptyState title={forum.t("forum.empty")} />;
  return (
    <ForumLayout data={data}>
      <h1>{forum.t("forum.categories")}</h1>
      <div class="forum-grid forum-grid-cols">
        {categories.map((c) => (
          <CategoryCard key={c.id} category={c} href={`${forum.basePath}/c/${c.slug}`} forum={forum} />
        ))}
      </div>
    </ForumLayout>
  );
}

export function ThreadListItem({
  thread,
  href,
  forum,
}: {
  thread: ForumThread;
  href: string;
  forum: ForumRuntimeContext;
}) {
  return (
    <li class="forum-card" style={{ listStyle: "none" }}>
      {thread.isPinned ? (
        <span style={{ fontSize: "0.75rem", color: "var(--forum-accent)" }}>{forum.t("forum.thread.pinned")}</span>
      ) : null}
      <h3 style={{ margin: "0.25rem 0" }}>
        <a href={href}>{thread.title}</a>
      </h3>
      <p style={{ fontSize: "0.875rem", color: "var(--forum-muted)", margin: 0 }}>
        {forum.t("forum.replies", { count: thread.postCount })} · {forum.t("forum.views", { count: thread.viewCount })}
      </p>
    </li>
  );
}

export function ThreadList({ data }: ForumPageProps) {
  const forum = data.forum as ForumRuntimeContext;
  const threads = (data.threads as ForumThread[]) ?? [];
  const category = data.category as ForumCategory | undefined;
  return (
    <ForumLayout data={data}>
      <h1>{category?.name ?? forum.t("forum.threads")}</h1>
      {threads.length ? (
        <ul style={{ padding: 0, display: "grid", gap: "0.75rem" }}>
          {threads.map((t) => (
            <ThreadListItem key={t.id} thread={t} href={`${forum.basePath}/t/${t.slug}`} forum={forum} />
          ))}
        </ul>
      ) : (
        <EmptyState title={forum.t("forum.empty")} />
      )}
      {data.pagination ? (
        <Pagination meta={data.pagination as { page: number; totalPages: number }} baseUrl={data.pageUrl as string} />
      ) : null}
    </ForumLayout>
  );
}

export function ThreadHeader({
  thread,
  category,
  forum,
}: {
  thread: ForumThread;
  category: ForumCategory;
  forum: ForumRuntimeContext;
}) {
  return (
    <header style={{ marginBottom: "1.5rem" }}>
      <p style={{ fontSize: "0.875rem", color: "var(--forum-muted)", margin: 0 }}>
        <a href={`${forum.basePath}/c/${category.slug}`}>{category.name}</a>
      </p>
      <h1 style={{ margin: "0.25rem 0" }}>{thread.title}</h1>
      {thread.status === "closed" ? (
        <p role="status" class="forum-error">
          {forum.t("forum.thread.closed")}
        </p>
      ) : null}
      <TagList tags={(thread as ForumThread & { tags?: Array<{ slug: string; name: string }> }).tags ?? []} basePath={forum.basePath} />
    </header>
  );
}

export function Post({
  post,
  author,
  forum,
}: {
  post: ForumPost;
  author?: { displayName: string };
  forum: ForumRuntimeContext;
}) {
  if (post.deletedAt) {
    return (
      <article class="forum-card" style={{ opacity: 0.7 }}>
        <p style={{ margin: 0, fontStyle: "italic" }}>{forum.t("forum.post.deleted")}</p>
      </article>
    );
  }
  if (post.isHidden) {
    return (
      <article class="forum-card" style={{ opacity: 0.7 }}>
        <p style={{ margin: 0, fontStyle: "italic" }}>{forum.t("forum.post.hidden")}</p>
      </article>
    );
  }
  return (
    <article class="forum-card" id={`post-${post.id}`}>
      <header style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.75rem" }}>
        <UserAvatar user={author ? { id: post.authorId, displayName: author.displayName, roles: [] } : undefined} />
        <div>
          <strong>{author?.displayName ?? post.authorId}</strong>
          <time dateTime={post.createdAt} style={{ display: "block", fontSize: "0.75rem", color: "var(--forum-muted)" }}>
            {new Date(post.createdAt).toLocaleString()}
          </time>
        </div>
      </header>
      <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
      <PostActions post={post} forum={forum} />
    </article>
  );
}

export function PostActions({ post, forum }: { post: ForumPost; forum: ForumRuntimeContext }) {
  return (
    <footer style={{ marginTop: "0.75rem", display: "flex", gap: "1rem", fontSize: "0.875rem" }}>
      {forum.can("report:create") ? (
        <a href={`${forum.basePath}/report?targetType=post&targetId=${post.id}`}>{forum.t("forum.report")}</a>
      ) : null}
      {forum.user?.id === post.authorId && forum.can("post:update-own") ? (
        <a href={`${forum.basePath}/t/${(forum as unknown as { threadSlug?: string }).threadSlug ?? ""}/edit?postId=${post.id}`}>
          {forum.t("forum.edit")}
        </a>
      ) : null}
    </footer>
  );
}

export function PostList({ data }: ForumPageProps) {
  const forum = data.forum as ForumRuntimeContext;
  const thread = data.thread as ForumThread;
  const category = data.category as ForumCategory;
  const posts = (data.posts as ForumPost[]) ?? [];
  const authors = (data.authors as Record<string, { displayName: string }>) ?? {};

  return (
    <ForumLayout data={data}>
      <ThreadHeader thread={thread} category={category} forum={forum} />
      <div style={{ display: "grid", gap: "1rem" }}>
        {posts.map((p) => (
          <Post key={p.id} post={p} author={authors[p.authorId]} forum={forum} />
        ))}
      </div>
      {thread.status !== "closed" && forum.can("post:create") ? (
        <PostComposer data={data} />
      ) : null}
    </ForumLayout>
  );
}

export function ThreadPage({ data }: ForumPageProps) {
  return <PostList data={data} />;
}

export function PostComposer({ data }: ForumPageProps) {
  const forum = data.forum as ForumRuntimeContext;
  const thread = data.thread as ForumThread;
  const actionData = data.actionData as { fieldErrors?: Record<string, string[]> } | undefined;
  return (
    <form
      method="post"
      action={`${forum.basePath}/t/${thread.slug}`}
      style={{ marginTop: "1.5rem" }}
      class="forum-card"
    >
      <input type="hidden" name="intent" value="reply" />
      <label htmlFor="forum-content">{forum.t("forum.reply")}</label>
      <textarea
        id="forum-content"
        name="content"
        rows={5}
        required
        placeholder={forum.t("forum.compose.placeholder")}
        style={{ width: "100%", marginTop: "0.5rem", borderRadius: "var(--forum-radius)", border: "1px solid var(--forum-border)", padding: "0.5rem" }}
      />
      {actionData?.fieldErrors?.content?.map((e) => (
        <p key={e} class="forum-error">
          {e}
        </p>
      ))}
      <button type="submit" class="forum-btn" style={{ marginTop: "0.75rem" }}>
        {forum.t("forum.compose.submit")}
      </button>
    </form>
  );
}

export function MarkdownPreview({ markdown }: { markdown: string }) {
  return (
    <div class="forum-card">
      <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{markdown}</pre>
    </div>
  );
}

export function ReportForm({ data }: ForumPageProps) {
  const forum = data.forum as ForumRuntimeContext;
  const targetType = (data.targetType as string) ?? "post";
  const targetId = (data.targetId as string) ?? "";
  const reasons = (data.reportReasons as string[]) ?? ["spam", "harassment", "off-topic", "other"];
  return (
    <ForumLayout data={data}>
      <h1>{forum.t("forum.report")}</h1>
      <form method="post" class="forum-card">
        <input type="hidden" name="intent" value="report" />
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <label htmlFor="reason">{forum.t("forum.report.reason")}</label>
        <select id="reason" name="reason" required style={{ display: "block", width: "100%", margin: "0.5rem 0" }}>
          {reasons.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <label htmlFor="details">{forum.t("forum.report.details")}</label>
        <textarea id="details" name="details" rows={4} style={{ width: "100%", marginTop: "0.5rem" }} />
        <button type="submit" class="forum-btn" style={{ marginTop: "0.75rem" }}>
          {forum.t("forum.report.submit")}
        </button>
      </form>
    </ForumLayout>
  );
}

export function ModerationQueue({ data }: ForumPageProps) {
  const forum = data.forum as ForumRuntimeContext;
  const reports = (data.reports as Array<{ id: string; reason: string; status: string; targetType: string }>) ?? [];
  return (
    <ForumLayout data={data}>
      <h1>{forum.t("forum.moderation")}</h1>
      {reports.length ? (
        <ul style={{ padding: 0, display: "grid", gap: "0.75rem" }}>
          {reports.map((r) => (
            <li key={r.id} class="forum-card" style={{ listStyle: "none" }}>
              <a href={`${forum.basePath}/moderation/reports/${r.id}`}>
                {r.targetType}: {r.reason} ({r.status})
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={forum.t("forum.empty")} />
      )}
    </ForumLayout>
  );
}

export function NewThreadForm({ data }: ForumPageProps) {
  const forum = data.forum as ForumRuntimeContext;
  const categories = (data.categories as ForumCategory[]) ?? [];
  const actionData = data.actionData as { fieldErrors?: Record<string, string[]>; values?: Record<string, string> } | undefined;
  return (
    <ForumLayout data={data}>
      <h1>{forum.t("forum.thread.create")}</h1>
      <form method="post" class="forum-card">
        <input type="hidden" name="intent" value="create-thread" />
        <label htmlFor="categoryId">{forum.t("forum.thread.category")}</label>
        <select id="categoryId" name="categoryId" required defaultValue={actionData?.values?.categoryId} style={{ display: "block", width: "100%", margin: "0.5rem 0 1rem" }}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label htmlFor="title">{forum.t("forum.thread.title")}</label>
        <input id="title" name="title" required defaultValue={actionData?.values?.title} style={{ display: "block", width: "100%", margin: "0.5rem 0 1rem", padding: "0.5rem" }} />
        <label htmlFor="content">{forum.t("forum.compose.placeholder")}</label>
        <textarea id="content" name="content" rows={8} required defaultValue={actionData?.values?.content} style={{ width: "100%", marginTop: "0.5rem" }} />
        <label htmlFor="tags">{forum.t("forum.thread.tags")}</label>
        <input id="tags" name="tags" defaultValue={actionData?.values?.tags} style={{ display: "block", width: "100%", margin: "0.5rem 0 1rem", padding: "0.5rem" }} />
        {actionData?.fieldErrors &&
          Object.entries(actionData.fieldErrors).map(([k, errs]) =>
            errs.map((e) => (
              <p key={`${k}-${e}`} class="forum-error">
                {e}
              </p>
            )),
          )}
        <button type="submit" class="forum-btn">{forum.t("forum.thread.create")}</button>
      </form>
    </ForumLayout>
  );
}

export function SearchPage({ data }: ForumPageProps) {
  const forum = data.forum as ForumRuntimeContext;
  const hits = (data.hits as Array<{ thread: ForumThread; snippet?: string }>) ?? [];
  const q = (data.q as string) ?? "";
  return (
    <ForumLayout data={data}>
      <h1>{forum.t("forum.search")}</h1>
      <form method="get" role="search">
        <label htmlFor="q" class="sr-only">
          {forum.t("forum.search")}
        </label>
        <input id="q" name="q" defaultValue={q} placeholder={forum.t("forum.search.placeholder")} style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }} />
        <button type="submit" class="forum-btn">{forum.t("forum.search")}</button>
      </form>
      <ul style={{ padding: 0, marginTop: "1.5rem" }}>
        {hits.map((h) => (
          <li key={h.thread.id} class="forum-card" style={{ listStyle: "none", marginBottom: "0.75rem" }}>
            <a href={`${forum.basePath}/t/${h.thread.slug}`}>{h.thread.title}</a>
            {h.snippet ? <p style={{ fontSize: "0.875rem", color: "var(--forum-muted)" }}>{h.snippet}</p> : null}
          </li>
        ))}
      </ul>
    </ForumLayout>
  );
}

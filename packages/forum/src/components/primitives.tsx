import type { ForumUser } from "../types.js";

export function UserAvatar({ user, size = 32 }: { user?: ForumUser; size?: number }) {
  const initials = user?.displayName?.slice(0, 2).toUpperCase() ?? "?";
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "cover" }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--forum-border)",
        fontSize: size * 0.4,
        fontWeight: 600,
      }}
    >
      {initials}
    </span>
  );
}

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  return (
    <div role="status" class="forum-card" style={{ textAlign: "center", padding: "2rem" }}>
      <p style={{ fontWeight: 600, margin: 0 }}>{title}</p>
      {message ? <p style={{ color: "var(--forum-muted)", marginTop: "0.5rem" }}>{message}</p> : null}
    </div>
  );
}

export function ForumError({ message }: { message: string }) {
  return (
    <div role="alert" class="forum-error forum-card">
      {message}
    </div>
  );
}

export function Pagination({
  meta,
  baseUrl,
}: {
  meta: { page: number; totalPages: number };
  baseUrl: string;
}) {
  if (meta.totalPages <= 1) return null;
  const prev = meta.page > 1 ? `${baseUrl}?page=${meta.page - 1}` : null;
  const next = meta.page < meta.totalPages ? `${baseUrl}?page=${meta.page + 1}` : null;
  return (
    <nav aria-label="Pagination" style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
      {prev ? (
        <a href={prev} class="forum-btn forum-btn-secondary">
          ← Prev
        </a>
      ) : (
        <span aria-disabled="true" style={{ opacity: 0.5 }}>
          ← Prev
        </span>
      )}
      <span style={{ alignSelf: "center", color: "var(--forum-muted)" }}>
        {meta.page} / {meta.totalPages}
      </span>
      {next ? (
        <a href={next} class="forum-btn forum-btn-secondary">
          Next →
        </a>
      ) : (
        <span aria-disabled="true" style={{ opacity: 0.5 }}>
          Next →
        </span>
      )}
    </nav>
  );
}

export function TagList({ tags, basePath }: { tags: Array<{ slug: string; name: string }>; basePath: string }) {
  if (!tags.length) return null;
  return (
    <ul style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", listStyle: "none", padding: 0, margin: 0 }}>
      {tags.map((tag) => (
        <li key={tag.slug}>
          <a
            href={`${basePath}/tags/${tag.slug}`}
            style={{
              display: "inline-block",
              padding: "0.125rem 0.5rem",
              borderRadius: "999px",
              border: "1px solid var(--forum-border)",
              fontSize: "0.875rem",
              textDecoration: "none",
            }}
          >
            {tag.name}
          </a>
        </li>
      ))}
    </ul>
  );
}

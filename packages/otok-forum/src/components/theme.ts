/** Forum theme tokens — override via CSS custom properties on `.otok-forum` */
export const FORUM_THEME_CSS = `
.otok-forum {
  --forum-bg: var(--forum-bg, #ffffff);
  --forum-fg: var(--forum-fg, #1a1a1a);
  --forum-muted: var(--forum-muted, #6b7280);
  --forum-border: var(--forum-border, #e5e7eb);
  --forum-accent: var(--forum-accent, #2563eb);
  --forum-accent-fg: var(--forum-accent-fg, #ffffff);
  --forum-danger: var(--forum-danger, #dc2626);
  --forum-radius: var(--forum-radius, 0.5rem);
  --forum-focus: var(--forum-focus, 0 0 0 2px #2563eb66);
  font-family: system-ui, sans-serif;
  color: var(--forum-fg);
  background: var(--forum-bg);
  line-height: 1.5;
}
@media (prefers-color-scheme: dark) {
  .otok-forum {
    --forum-bg: #111827;
    --forum-fg: #f3f4f6;
    --forum-muted: #9ca3af;
    --forum-border: #374151;
    --forum-accent: #3b82f6;
  }
}
.otok-forum a { color: var(--forum-accent); }
.otok-forum a:focus-visible { outline: none; box-shadow: var(--forum-focus); border-radius: 2px; }
.otok-forum button:focus-visible, .otok-forum input:focus-visible, .otok-forum textarea:focus-visible {
  outline: none; box-shadow: var(--forum-focus);
}
.otok-forum .forum-card {
  border: 1px solid var(--forum-border);
  border-radius: var(--forum-radius);
  padding: 1rem;
}
.otok-forum .forum-btn {
  background: var(--forum-accent);
  color: var(--forum-accent-fg);
  border: none;
  border-radius: var(--forum-radius);
  padding: 0.5rem 1rem;
  cursor: pointer;
}
.otok-forum .forum-btn-secondary {
  background: transparent;
  color: var(--forum-accent);
  border: 1px solid var(--forum-border);
}
.otok-forum .forum-error { color: var(--forum-danger); font-size: 0.875rem; }
.otok-forum .forum-nav { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
.otok-forum .forum-grid { display: grid; gap: 1rem; }
@media (min-width: 640px) { .otok-forum .forum-grid-cols { grid-template-columns: repeat(2, 1fr); } }
`;

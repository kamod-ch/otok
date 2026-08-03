# @otok/forum — Phase 2 backlog

Items intentionally deferred from the initial release for a clean public API surface.

## Search

- [ ] PostgreSQL full-text search provider (`tsvector`)
- [ ] Meilisearch / Typesense adapters
- [ ] Search result highlighting

## Progressive enhancement islands

- [ ] Hydrated markdown preview island
- [ ] Reaction picker island (server fallback: form POST)
- [ ] Subscribe toggle island
- [ ] Draft autosave (localStorage + server draft table)

## Realtime

- [ ] `@kamod-ch/otok-realtime` integration for live thread updates
- [ ] Typing indicators

## Notifications

- [ ] `@kamod-ch/otok-notifications` email/in-app delivery
- [ ] Webhook outbox via `@kamod-ch/otok-events`

## SEO

- [ ] Per-category RSS feeds
- [ ] Sitemap plugin hook registration
- [ ] OG image generation via `@kamod-ch/otok-seo`

## Moderation

- [ ] Bulk moderation actions
- [ ] User bans/suspensions (via external auth adapter hook)
- [ ] Automated moderation rules

## Content

- [ ] @mention parsing and notifications
- [ ] Quote/reply threading UI depth limits
- [ ] Attachment uploads (via `@kamod-ch/otok-uploads`)

## Infrastructure

- [ ] Redis-backed rate limiting
- [ ] Distributed slug uniqueness (cross-region)
- [ ] `@otok/preset-forum` scaffold for `create otok`

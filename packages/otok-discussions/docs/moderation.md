# Moderation & operational lifecycle

## Trust levels (pre / post / trusted)

The app **always** supplies trust — the plugin does not compute hidden reputation.

| App signal | Default when missing | `pre` mode | `post` mode | `trusted` mode |
|------------|----------------------|------------|-------------|----------------|
| `standard` | **default** | pending | published | published |
| `trusted` (role or explicit level) | — | pending | published | published |
| `restricted` | — | pending | pending | pending |

Map roles via `authorTrustLevelFromRoles()` or pass explicit trust on comment create (future host hook).  
Configured trusted role defaults to `discussions_trusted` in runtime rules (`trustedRole`).

## Effective thread status (auto-close)

`resolveEffectiveThreadStatus()` runs on **every read/mutation** (`DiscussionAccess.materializeThread`).  
When `closesAt <= now`, effective status becomes `closed` even if the stored row is still `open`.  
An optional background job may persist `closed`, but **must not** be the only enforcement layer.

## Moderator scope

- Moderators are scoped by `ModerationProvider.isModerator(actor, subject)` **and** optional `moderationAccess.moderatableTenantIds`.
- Cross-tenant “superadmin” requires an **explicit** role (default `discussions_superadmin`) — never inferred from a generic `admin` role.

## Queue & audit

Enable SSR moderation routes:

```ts
createDiscussions({
  moderationRoutes: true,
  moderationAccess: { superAdminRole: "discussions_superadmin", moderatableTenantIds: ["tenant-a"] },
});
```

Routes:

- `{basePath}/moderation/queue` — cursor paginated queue (`?kind=pending|reported|auto_flagged|all`)
- `{basePath}/moderation/comments/:commentId` — detail + audit trail + action form

Every `ModerationService.apply()` call writes an immutable `ModerationAction` row with `reasonCode`, optional `reasonText`, and structured `metadata.v = 1`.

Bulk actions use the same `apply()` path; partial failures are returned per target id.

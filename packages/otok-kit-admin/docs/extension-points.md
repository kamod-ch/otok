# Extension points — @kamod-ch/otok-kit-admin

## Domain

```ts
import { AdminDirectory, hasAdminPermission } from "@kamod-ch/otok-kit-admin";
```

`AdminDirectory` is an in-memory users/roles store. Swap for a Kysely adapter in the app; keep the same method names (`listUsers`, `createUser`, `listRoles`).

## Routes

| Path           | Role                       |
| -------------- | -------------------------- |
| `/admin`       | Overview                   |
| `/admin/users` | List + create users        |
| `/admin/roles` | List roles and permissions |

Override via `mergeKits` `overrides`. Do **not** copy `template-core` AppShell into this kit.

## Permissions

`admin:users:read|write`, `admin:roles:read|write`, `admin:org:read`, or `admin:*`.

Wire `hasAdminPermission` to the app auth `getRole` / grants list.

## Compose with CRM

```bash
pnpm create otok my-crm --variant crm --kit @kamod-ch/otok-kit-admin
```

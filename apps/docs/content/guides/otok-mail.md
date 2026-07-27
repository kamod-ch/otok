---
title: Mail Extension
section: Guides
order: 34
---
# @kamod-ch/otok-mail

Provider-based mail for Otok apps. Otok stays decoupled from any single vendor.

## Providers

| Provider | Use case |
|----------|----------|
| `test` | Unit tests and development preview |
| `smtp` | Generic SMTP (requires optional `nodemailer`) |
| `resend` | Resend HTTP API |
| `mailpit` | Local SMTP to Mailpit (`127.0.0.1:1025`) |

## Plugin

```ts
import mail from "@kamod-ch/otok-mail";

export default defineConfig({
  plugins: [
    mail({
      provider: { type: "test" },
      defaultFrom: "App <app@example.com>",
    }),
  ],
});
```

## Send mail

```ts
import { getMailClient } from "@kamod-ch/otok-mail";

await getMailClient().send({
  to: "user@example.com",
  subject: "Welcome",
  text: "Thanks for signing up.",
});
```

Preact templates via `sendTemplate()`. Development preview at `/__otok-mail/preview` when using the test provider.

See [`packages/otok-mail/README.md`](https://github.com/kamod-ch/otok/tree/main/packages/otok-mail).

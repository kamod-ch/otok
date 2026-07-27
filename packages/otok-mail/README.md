# @kamod-ch/otok-mail

Provider-based mail integration for [Otok](https://github.com/kamod-ch/otok) apps.

Otok stays decoupled from any single mail vendor. Choose SMTP, Resend, Mailpit (development), or a test provider that captures messages without sending.

## Install

```bash
pnpm add @kamod-ch/otok-mail preact
# Optional for SMTP / Mailpit:
pnpm add nodemailer
```

## Plugin

```ts
import { defineConfig } from "otok";
import mail from "@kamod-ch/otok-mail";

export default defineConfig({
  plugins: [
    mail({
      provider: { type: "test" },
      defaultFrom: "App <app@example.com>",
      preview: true,
    }),
  ],
});
```

## Send mail

```ts
import { getMailClient } from "@kamod-ch/otok-mail";

const mail = getMailClient();

await mail.send({
  to: "user@example.com",
  subject: "Welcome",
  text: "Thanks for signing up.",
  html: "<p>Thanks for signing up.</p>",
});
```

## Preact templates

```tsx
import { getMailClient } from "@kamod-ch/otok-mail";

function WelcomeEmail({ name }: { name: string }) {
  return <p>Hello {name}!</p>;
}

await getMailClient().sendTemplate({
  to: "user@example.com",
  subject: "Welcome",
  template: WelcomeEmail,
  props: { name: "Ada" },
});
```

## Providers

| Provider | Config | Notes |
|----------|--------|-------|
| `test` | `{ type: "test" }` | Captures messages in memory. Default for tests. |
| `smtp` | `{ type: "smtp", host, port?, user?, pass? }` | Requires optional `nodemailer` peer. |
| `resend` | `{ type: "resend", apiKey? }` | Uses `RESEND_API_KEY` when `apiKey` is omitted. |
| `mailpit` | `{ type: "mailpit" }` | SMTP to `127.0.0.1:1025`. Web UI at `http://127.0.0.1:8025`. |

## Development preview

When `preview: true` (default outside production) and the test provider is active, visit `/__otok-mail/preview` to inspect captured messages.

## Retry

Transient send failures are retried with exponential backoff (default: 3 attempts). Resend rate limits and SMTP connection errors are treated as retryable.

## Env vars

```
RESEND_API_KEY=
MAIL_SMTP_PASS=
```

## Exports

| Subpath | Purpose |
|---------|---------|
| `@kamod-ch/otok-mail` | Plugin factory, `getMailClient`, types |
| `@kamod-ch/otok-mail/providers/test` | Test provider helpers |
| `@kamod-ch/otok-mail/providers/smtp` | SMTP provider factory |
| `@kamod-ch/otok-mail/providers/resend` | Resend provider factory |
| `@kamod-ch/otok-mail/providers/mailpit` | Mailpit provider factory |

import type { Hono } from "hono";
import { createTestMailProvider, formatMailPreview, getCapturedMail } from "./providers/test.js";
import type { MailRuntime } from "./types.js";

export function configureMailPreviewRoute(app: Hono, runtime: MailRuntime): void {
  if (!runtime.previewEnabled || runtime.provider.name !== "test") {
    return;
  }

  app.get("/__otok-mail/preview", (c) => {
    const messages = getCapturedMail();
    const html = messages
      .map((message, index) => {
        const preview = formatMailPreview(message);
        return `<article style="margin-bottom:2rem;padding:1rem;border:1px solid #ddd;border-radius:8px;">
          <h2 style="margin:0 0 0.5rem;font-size:1rem;">#${index + 1} — ${message.subject}</h2>
          <pre style="white-space:pre-wrap;font-size:0.85rem;">${escapeHtml(preview)}</pre>
        </article>`;
      })
      .join("");

    return c.html(`<!DOCTYPE html>
<html>
  <head><title>otok-mail preview</title></head>
  <body style="font-family:system-ui;max-width:720px;margin:2rem auto;padding:0 1rem;">
    <h1>otok-mail preview</h1>
    <p>Provider: ${runtime.provider.name} (${messages.length} captured)</p>
    ${html || "<p>No messages captured yet.</p>"}
  </body>
</html>`);
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export { createTestMailProvider, getCapturedMail, resetTestMailProvider } from "./providers/test.js";

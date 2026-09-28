import type { OtokPageProps } from "@kamod-ch/otok/server";
import type { ModerationCommentDetail } from "../../types/moderation.js";
import type { ModerationQueueItem } from "../../types/moderation.js";
import { MODERATION_REASON_CODES } from "../../moderation/reason-codes.js";
import { HiddenFormFields } from "../../ui/HiddenFormFields.js";
import type { ModerationUiLabels } from "../../i18n/moderation-labels.js";
import type { DiscussionLocale } from "../../i18n/create.js";

type QueueData = {
  title: string;
  items: ModerationQueueItem[];
  nextCursor?: string;
  tenantId: string;
  csrfToken?: string;
  actionUrl: string;
  labels: ModerationUiLabels;
  locale: DiscussionLocale;
};

type DetailData = {
  title: string;
  detail: ModerationCommentDetail;
  csrfToken?: string;
  actionUrl: string;
  labels: ModerationUiLabels;
  locale: DiscussionLocale;
};

function readData<T>(props: OtokPageProps): T {
  return props.data as unknown as T;
}

export function ModerationQueuePage(props: OtokPageProps) {
  const data = readData<QueueData>(props);
  const { labels: l } = data;
  return (
    <main lang={data.locale} class="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 class="text-2xl font-semibold">{l.queueTitle}</h1>
      <p class="text-sm text-muted-foreground">
        {l.tenant}: {data.tenantId}
      </p>
      <table class="w-full border-collapse text-sm">
        <caption class="sr-only">{l.queueTitle}</caption>
        <thead>
          <tr class="border-b border-border text-left">
            <th scope="col" class="py-2">
              {l.tableComment}
            </th>
            <th scope="col">{l.tableKind}</th>
            <th scope="col">{l.tableAuthor}</th>
            <th scope="col">{l.tableReports}</th>
            <th scope="col">{l.tableAge}</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <tr key={item.commentId} class="border-b border-border/60">
              <td class="py-2">
                <a
                  href={`../comments/${encodeURIComponent(item.commentId)}`}
                  class="text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {item.commentId}
                </a>
              </td>
              <td>{item.queueKind}</td>
              <td>{item.authorId}</td>
              <td>{item.openReportCount}</td>
              <td>
                <time dateTime={item.createdAt}>{item.createdAt}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.nextCursor ? (
        <p>
          <a
            href={`?cursor=${encodeURIComponent(data.nextCursor)}`}
            class="text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {l.nextPage}
          </a>
        </p>
      ) : null}
    </main>
  );
}

export function ModerationDetailPage(props: OtokPageProps) {
  const data = readData<DetailData>(props);
  const { detail, labels: l } = data;
  return (
    <main lang={data.locale} class="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 class="text-2xl font-semibold">{l.detailTitle}</h1>
      <article class="rounded-lg border border-border p-4" aria-labelledby="mod-comment-status">
        <p id="mod-comment-status" class="text-xs text-muted-foreground">
          {l.status}: {detail.comment.status}
        </p>
        <p class="mt-2 whitespace-pre-wrap">{detail.comment.bodyMarkdown}</p>
      </article>
      <section aria-labelledby="mod-reports-heading">
        <h2 id="mod-reports-heading" class="text-lg font-medium">
          {l.reportsHeading}
        </h2>
        <ul class="list-disc pl-5 text-sm">
          {detail.reports.map((r) => (
            <li key={r.id}>
              {r.reason} — {r.status}
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="mod-audit-heading">
        <h2 id="mod-audit-heading" class="text-lg font-medium">
          {l.auditHeading}
        </h2>
        <ul class="list-disc pl-5 text-sm">
          {detail.actions.map((a) => (
            <li key={a.id}>
              {a.action} by {a.actorId} at <time dateTime={a.createdAt}>{a.createdAt}</time>
            </li>
          ))}
        </ul>
      </section>
      <form
        method="post"
        action={data.actionUrl}
        class="grid max-w-md gap-3 rounded-lg border border-border p-4"
        aria-labelledby="mod-form-heading"
      >
        <h2 id="mod-form-heading" class="text-base font-medium">
          {l.formAction}
        </h2>
        <HiddenFormFields csrfToken={data.csrfToken} idempotencyKey={`mod-${detail.comment.id}`} />
        <input type="hidden" name="intent" value="moderation_apply" />
        <input type="hidden" name="targetId" value={detail.comment.id} />
        <label class="grid gap-1 text-sm">
          {l.formAction}
          <select name="action" class="h-9 rounded-md border border-border px-2">
            <option value="publish">publish</option>
            <option value="reject">reject</option>
            <option value="hide">hide</option>
            <option value="restore">restore</option>
            <option value="delete">delete</option>
            <option value="anonymize">anonymize</option>
          </select>
        </label>
        <label class="grid gap-1 text-sm">
          {l.formReason}
          <select name="reasonCode" class="h-9 rounded-md border border-border px-2">
            {MODERATION_REASON_CODES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <label class="grid gap-1 text-sm">
          {l.formNote}
          <textarea name="reasonText" rows={3} class="rounded-md border border-border px-2 py-1" />
        </label>
        <button
          type="submit"
          class="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {l.apply}
        </button>
      </form>
    </main>
  );
}

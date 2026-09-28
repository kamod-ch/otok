import { Alert, AlertDescription, AlertTitle } from "@kamod-ch/ui/alert";
import { Button } from "@kamod-ch/ui/button";
import { Textarea } from "@kamod-ch/ui/textarea";
import type { DiscussionFormConfig, DiscussionLabels } from "./types.js";
import { HiddenFormFields } from "./HiddenFormFields.js";
import { DISCUSSION_REPORT_REASONS } from "./report-reasons.js";
import { discussionsThreadViewUrl } from "./thread-url.js";

export interface ReportFormPanelProps {
  open: boolean;
  commentId: string;
  labels: DiscussionLabels;
  form: Pick<DiscussionFormConfig, "actionUrl" | "csrfToken">;
  basePath: string;
  subjectId: string;
  sort?: import("../types/domain.js").CommentSort;
  formErrors?: string[];
}

export function ReportFormPanel({
  open,
  commentId,
  labels,
  form,
  basePath,
  subjectId,
  sort,
  formErrors,
}: ReportFormPanelProps) {
  if (!open) return null;

  const cancelHref = discussionsThreadViewUrl(basePath, subjectId, { sort });

  return (
    <section
      class="rounded-lg border border-border bg-card p-4 shadow-sm"
      role="dialog"
      aria-label={labels.reportDialogLabel}
      aria-labelledby={`report-title-${commentId}`}
      aria-modal="false"
      data-discussion-report-panel=""
    >
      <h3 id={`report-title-${commentId}`} class="text-base font-semibold text-foreground">
        {labels.reportTitle}
      </h3>
      <p class="mt-1 text-sm text-muted-foreground">{labels.reportDescription}</p>
      <form method="post" action={form.actionUrl} class="mt-4 grid gap-3">
        <HiddenFormFields csrfToken={form.csrfToken} idempotencyKey={`report-${commentId}`} />
        <input type="hidden" name="intent" value="report" />
        <input type="hidden" name="targetType" value="comment" />
        <input type="hidden" name="targetId" value={commentId} />
        <input
          type="hidden"
          name="redirectTo"
          value={discussionsThreadViewUrl(basePath, subjectId, { sort, reportAck: true })}
        />
        <label class="grid gap-1 text-sm" for={`report-reason-${commentId}`}>
          {labels.reportReasonLabel}
          <select
            id={`report-reason-${commentId}`}
            name="reason"
            required
            class="h-9 rounded-md border border-border bg-background px-2 text-sm"
          >
            {DISCUSSION_REPORT_REASONS.map((reason) => (
              <option value={reason.value}>{reason.label}</option>
            ))}
          </select>
        </label>
        <label class="grid gap-1 text-sm" for={`report-details-${commentId}`}>
          {labels.reportDetailsLabel}
          <Textarea id={`report-details-${commentId}`} name="details" rows={3} maxLength={2000} />
        </label>
        {formErrors?.length ? (
          <Alert variant="error">
            <AlertTitle>{labels.reportTitle}</AlertTitle>
            <AlertDescription>{formErrors.join(" ")}</AlertDescription>
          </Alert>
        ) : null}
        <div class="flex flex-wrap gap-2">
          <Button type="submit">{labels.reportSubmit}</Button>
          <a
            href={cancelHref}
            class="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {labels.reportCancel}
          </a>
        </div>
      </form>
    </section>
  );
}

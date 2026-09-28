import { Textarea } from "@kamod-ch/ui/textarea";
import { Button } from "@kamod-ch/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@kamod-ch/ui/card";
import type { DiscussionFormConfig, DiscussionLabels } from "./types.js";
import { HiddenFormFields } from "./HiddenFormFields.js";

export interface CommentComposerShellProps {
  labels: DiscussionLabels;
  form: DiscussionFormConfig;
  defaultValue?: string;
  fieldErrors?: string[];
  formErrors?: string[];
  disabled?: boolean;
  disabledReason?: string;
  maxCommentLength?: number;
  textareaId?: string;
  draftScope?: string;
}

export function CommentComposerShell({
  labels,
  form,
  defaultValue = "",
  fieldErrors,
  formErrors,
  disabled,
  disabledReason,
  maxCommentLength = 10_000,
  textareaId = "discussion-composer-body",
  draftScope,
}: CommentComposerShellProps) {
  const errors = [...(formErrors ?? []), ...(fieldErrors ?? [])];
  const initialLength = defaultValue.length;

  if (disabled) {
    return (
      <Card size="sm" aria-disabled="true">
        <CardHeader>
          <CardTitle>{labels.composerLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-sm text-muted-foreground">{disabledReason ?? labels.readOnlyDescription}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{labels.composerLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <form method="post" action={form.actionUrl} class="grid gap-3" data-discussion-composer="">
          <HiddenFormFields csrfToken={form.csrfToken} idempotencyKey={form.idempotencyKey} />
          <input type="hidden" name="intent" value={form.intent} />
          {form.redirectTo ? <input type="hidden" name="redirectTo" value={form.redirectTo} /> : null}
          {form.parentCommentId ? (
            <input type="hidden" name="parentCommentId" value={form.parentCommentId} />
          ) : null}
          <label class="sr-only" for={textareaId}>
            {labels.composerLabel}
          </label>
          <Textarea
            id={textareaId}
            name="bodyMarkdown"
            required
            maxLength={maxCommentLength}
            placeholder={labels.composerPlaceholder}
            defaultValue={defaultValue}
            aria-invalid={Boolean(fieldErrors?.length)}
            aria-describedby={`${textareaId}-meta${errors.length ? ` ${textareaId}-errors` : ""}`}
            rows={4}
            class="min-h-24 w-full resize-y"
            data-discussion-draft-scope={draftScope}
          />
          <p id={`${textareaId}-meta`} class="text-xs text-muted-foreground" data-discussion-char-count="">
            {labels.charCount(initialLength, maxCommentLength)}
          </p>
          {errors.length ? (
            <div
              id={`${textareaId}-errors`}
              role="alert"
              aria-label={labels.a11yComposerErrors}
              class="grid gap-1 text-sm text-destructive"
              data-discussion-composer-errors=""
            >
              {errors.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          ) : null}
          <div class="flex flex-wrap items-center gap-3">
            <Button type="submit">{labels.composerSubmit}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

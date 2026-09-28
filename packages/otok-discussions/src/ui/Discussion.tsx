import type { DiscussionProps } from "./types.js";
import { resolveDiscussionLabels } from "./labels.js";
import { threadAllowsComments, threadAllowsReactions } from "./thread-policy.js";
import { DiscussionHeader } from "./DiscussionHeader.js";
import { DiscussionNotice } from "./DiscussionNotice.js";
import { DiscussionLoading } from "./DiscussionLoading.js";
import { TopCommentsPreview } from "./TopCommentsPreview.js";
import { ShowAllCommentsCta } from "./ShowAllCommentsCta.js";
import { LoginPrompt } from "./LoginPrompt.js";
import { CommentComposerShell } from "./CommentComposerShell.js";
import { DiscussionSortNav } from "./DiscussionSortNav.js";
import { ThreadPagination } from "./ThreadPagination.js";
import { CommentThreadList } from "./CommentThreadList.js";
import { Alert, AlertDescription, AlertTitle } from "@kamod-ch/ui/alert";

const HEADING_ID = "discussion-heading";

export function Discussion({ model, showComposer = true }: DiscussionProps) {
  const labels = resolveDiscussionLabels(model.labels);
  const actionUrl = model.form?.actionUrl ?? model.urls.fullDiscussion ?? "#";
  const csrfToken = model.form?.csrfToken;
  const canComment = threadAllowsComments(model.thread?.status);
  const canReact =
    model.viewer.isAuthenticated && threadAllowsReactions(model.thread?.status) && model.shell === "ready";
  const isThread = model.layout === "thread";
  const maxCommentLength = model.maxCommentLength ?? 10_000;

  return (
    <>
      <a
        href="#discussion-region"
        class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:shadow-md"
      >
        {labels.skipToDiscussion}
      </a>
      <section
        id="discussion-region"
        lang={model.locale ?? "de"}
        class="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6"
        aria-labelledby={HEADING_ID}
        data-discussion-layout={model.layout}
        data-discussion-shell={model.shell}
        data-discussion-locale={model.locale ?? "de"}
      >
      {model.shell === "loading" ? <DiscussionLoading labels={labels} /> : null}

      {model.shell === "error" ? (
        <DiscussionNotice labels={labels} errorMessage={model.errorMessage ?? labels.errorTitle} />
      ) : null}

      {model.shell === "ready" ? (
        <>
          <DiscussionHeader model={model} labels={labels} headingId={HEADING_ID} />
          <DiscussionNotice
            labels={labels}
            threadStatus={model.thread?.status}
            notices={model.notices}
            opensAt={model.thread?.opensAt}
          />
          {model.reportAcknowledged ? (
            <Alert variant="success">
              <AlertTitle>{labels.reportTitle}</AlertTitle>
              <AlertDescription>{labels.reportAck}</AlertDescription>
            </Alert>
          ) : null}

          {isThread && model.basePath && model.subjectId ? (
            <DiscussionSortNav
              basePath={model.basePath}
              subjectId={model.subjectId}
              active={model.sort ?? "newest"}
              labels={labels}
            />
          ) : null}

          {isThread ? (
            <>
              {model.comments.length ? (
                <CommentThreadList
                  comments={model.comments}
                  labels={labels}
                  model={model}
                  canReact={canReact}
                  actionUrl={actionUrl}
                  csrfToken={csrfToken}
                />
              ) : (
                <TopCommentsPreview
                  comments={[]}
                  labels={labels}
                  viewerUserId={model.viewer.userId}
                  canReact={canReact}
                  actionUrl={actionUrl}
                  csrfToken={csrfToken}
                />
              )}
              {model.basePath && model.subjectId ? (
                <ThreadPagination
                  basePath={model.basePath}
                  subjectId={model.subjectId}
                  sort={model.sort ?? "newest"}
                  nextCursor={model.nextCursor}
                  labels={labels}
                />
              ) : null}
            </>
          ) : (
            <>
              <TopCommentsPreview
                comments={model.comments}
                labels={labels}
                viewerUserId={model.viewer.userId}
                canReact={canReact}
                actionUrl={actionUrl}
                csrfToken={csrfToken}
              />
              {model.layout === "preview" && model.urls.fullDiscussion ? (
                <ShowAllCommentsCta href={model.urls.fullDiscussion} labels={labels} />
              ) : null}
            </>
          )}

          {showComposer ? (
            model.viewer.isAuthenticated ? (
              canComment && model.form ? (
                <CommentComposerShell
                  labels={labels}
                  form={model.form}
                  defaultValue={model.values?.bodyMarkdown}
                  fieldErrors={model.fieldErrors?.bodyMarkdown}
                  formErrors={model.formErrors}
                  maxCommentLength={maxCommentLength}
                  draftScope={model.draftScope}
                />
              ) : (
                <CommentComposerShell
                  labels={labels}
                  form={model.form ?? { actionUrl, intent: "comment", csrfToken }}
                  disabled
                  disabledReason={
                    model.thread?.status === "scheduled"
                      ? labels.scheduledDescription
                      : labels.closedDescription
                  }
                />
              )
            ) : (
              <LoginPrompt labels={labels} loginHref={model.urls.login} />
            )
          ) : null}
        </>
      ) : null}
      </section>
    </>
  );
}

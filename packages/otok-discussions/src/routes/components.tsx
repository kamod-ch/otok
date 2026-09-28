import type { OtokPageProps } from "@kamod-ch/otok/server";
import { Discussion } from "../ui/Discussion.js";
import { discussionViewModelFromPageData, type PluginDiscussionPageData } from "../ui/map-page-data.js";
import { defaultDiscussionLabels } from "../ui/labels.js";

export type PageData = PluginDiscussionPageData;

function readPageData(props: OtokPageProps): PluginDiscussionPageData {
  return props.data as unknown as PluginDiscussionPageData;
}

export function DiscussionsPreviewPage(props: OtokPageProps) {
  const model = discussionViewModelFromPageData({ ...readPageData(props), layout: "preview" });
  return (
    <main>
      <Discussion model={model} />
    </main>
  );
}

export function DiscussionsThreadPage(props: OtokPageProps) {
  const model = discussionViewModelFromPageData({ ...readPageData(props), layout: "thread" });
  return (
    <main>
      <Discussion model={model} />
    </main>
  );
}

export function DiscussionsRepliesPage(props: OtokPageProps) {
  const data = readPageData(props);
  const model = discussionViewModelFromPageData({
    ...data,
    layout: "thread",
    title: data.title ?? "Replies",
  });
  if (data.comment?.id && model.form) {
    model.form = {
      ...model.form,
      intent: "reply",
      parentCommentId: data.comment.id,
      idempotencyKey: "reply-create",
    };
  }
  return (
    <main>
      <Discussion model={model} />
    </main>
  );
}

export function DiscussionsPermalinkPage(props: OtokPageProps) {
  const data = readPageData(props);
  if (!data.comment || !data.tree?.length) {
    return (
      <main class="px-6 py-10">
        <p>Not found</p>
      </main>
    );
  }
  const model = discussionViewModelFromPageData({ ...data, layout: "permalink" });
  return (
    <main>
      {data.fullDiscussionUrl ? (
        <p class="mx-auto max-w-3xl px-4 pt-6 text-sm">
          <a href={data.fullDiscussionUrl} class="text-primary underline-offset-2 hover:underline">
            {defaultDiscussionLabels.viewInThread}
          </a>
        </p>
      ) : null}
      <Discussion model={model} showComposer={false} />
    </main>
  );
}

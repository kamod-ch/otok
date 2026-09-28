import type { DiscussionLabels } from "./types.js";

export interface ShowAllCommentsCtaProps {
  href: string;
  labels: DiscussionLabels;
}

export function ShowAllCommentsCta({ href, labels }: ShowAllCommentsCtaProps) {
  return (
    <p class="text-center">
      <a
        href={href}
        class="inline-flex min-h-8 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {labels.showAllComments}
      </a>
    </p>
  );
}

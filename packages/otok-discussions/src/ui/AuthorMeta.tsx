import { Avatar, AvatarFallback, AvatarImage } from "@kamod-ch/ui/avatar";
import type { DiscussionAuthorView } from "./types.js";
import { authorInitials, formatDiscussionTimestamp } from "./format.js";

function resolveTimeLabel(displayTime: string | undefined, createdAt: string): string {
  return displayTime ?? formatDiscussionTimestamp(createdAt);
}

export interface AuthorMetaProps {
  author: DiscussionAuthorView;
  createdAt: string;
  displayTime?: string;
  permalinkHref?: string;
  permalinkLabel: string;
}

export function AuthorMeta({ author, createdAt, displayTime, permalinkHref, permalinkLabel }: AuthorMetaProps) {
  const initials = authorInitials(author.displayName);
  return (
    <header class="flex min-w-0 items-start gap-3">
      <Avatar size="sm" class="mt-0.5">
        {author.avatarUrl ? <AvatarImage src={author.avatarUrl} alt="" /> : null}
        <AvatarFallback aria-hidden="true">{initials}</AvatarFallback>
      </Avatar>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-foreground">
          <span class="break-words">{author.displayName}</span>
        </p>
        <p class="text-xs text-muted-foreground">
          <time dateTime={createdAt}>{resolveTimeLabel(displayTime, createdAt)}</time>
          {permalinkHref ? (
            <>
              {" · "}
              <a href={permalinkHref} class="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {permalinkLabel}
              </a>
            </>
          ) : null}
        </p>
      </div>
    </header>
  );
}

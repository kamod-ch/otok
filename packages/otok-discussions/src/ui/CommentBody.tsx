export interface CommentBodyProps {
  bodyMarkdown: string;
  isPlaceholder: boolean;
  placeholderText: string;
  isPending?: boolean;
}

import { SafeMarkdownBody } from "./SafeMarkdownBody.js";

export function CommentBody({ bodyMarkdown, isPlaceholder, placeholderText, isPending }: CommentBodyProps) {
  if (isPlaceholder) {
    return (
      <p class="text-sm italic text-muted-foreground" data-discussion-placeholder="">
        {placeholderText}
      </p>
    );
  }

  return (
    <SafeMarkdownBody
      source={bodyMarkdown}
      className={`break-words text-sm text-foreground ${isPending ? "opacity-80" : ""}`}
    />
  );
}

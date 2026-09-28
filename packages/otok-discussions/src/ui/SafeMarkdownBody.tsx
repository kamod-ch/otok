import { parseSafeDiscussionMarkdown } from "../security/markdown-render.js";

export interface SafeMarkdownBodyProps {
  source: string;
  className?: string;
}

export function SafeMarkdownBody({ source, className }: SafeMarkdownBodyProps) {
  const lines = source.split("\n");
  return (
    <div class={className}>
      {lines.map((line, lineIndex) => (
        <p key={lineIndex} class="whitespace-pre-wrap">
          {parseSafeDiscussionMarkdown(line).map((segment, index) => {
            switch (segment.kind) {
              case "text":
                return <span key={index}>{segment.value}</span>;
              case "strong":
                return <strong key={index}>{segment.value}</strong>;
              case "em":
                return <em key={index}>{segment.value}</em>;
              case "code":
                return (
                  <code key={index} class="rounded bg-muted px-1 py-0.5 text-xs">
                    {segment.value}
                  </code>
                );
              case "link": {
                const external = /^https?:\/\//i.test(segment.href);
                return (
                  <a
                    key={index}
                    href={segment.href}
                    rel={external ? "noopener noreferrer nofollow ugc" : undefined}
                    target={external ? "_blank" : undefined}
                    class="text-primary underline underline-offset-2"
                  >
                    {segment.label}
                  </a>
                );
              }
              default:
                return null;
            }
          })}
        </p>
      ))}
    </div>
  );
}

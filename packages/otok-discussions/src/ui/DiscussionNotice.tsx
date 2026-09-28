import { Alert, AlertDescription, AlertTitle } from "@kamod-ch/ui/alert";
import type { DiscussionThreadStatus } from "../types/domain.js";
import type { DiscussionLabels } from "./types.js";

export interface DiscussionNoticeProps {
  threadStatus?: DiscussionThreadStatus;
  labels: DiscussionLabels;
  notices?: string[];
  errorMessage?: string;
  opensAt?: string | null;
}

function threadNotice(
  status: DiscussionThreadStatus | undefined,
  labels: DiscussionLabels,
  opensAt?: string | null,
): { variant: "info" | "warning" | "error"; title: string; description: string } | null {
  switch (status) {
    case "scheduled":
      return {
        variant: "info",
        title: labels.scheduledTitle,
        description: opensAt
          ? `${labels.scheduledDescription} (${opensAt})`
          : labels.scheduledDescription,
      };
    case "read_only":
      return { variant: "warning", title: labels.readOnlyTitle, description: labels.readOnlyDescription };
    case "closed":
    case "archived":
      return { variant: "warning", title: labels.closedTitle, description: labels.closedDescription };
    default:
      return null;
  }
}

export function DiscussionNotice({ threadStatus, labels, notices, errorMessage, opensAt }: DiscussionNoticeProps) {
  const blocks: Array<{ key: string; variant: "info" | "warning" | "error"; title: string; description: string }> = [];

  if (errorMessage) {
    blocks.push({
      key: "error",
      variant: "error",
      title: labels.errorTitle,
      description: errorMessage,
    });
  }

  const thread = threadNotice(threadStatus, labels, opensAt);
  if (thread) blocks.push({ key: "thread", ...thread });

  for (const [index, message] of (notices ?? []).entries()) {
    blocks.push({ key: `notice-${index}`, variant: "info", title: labels.sectionTitle, description: message });
  }

  if (!blocks.length) return null;

  return (
    <div class="grid gap-3" role="status">
      {blocks.map((block) => (
        <Alert key={block.key} variant={block.variant}>
          <AlertTitle>{block.title}</AlertTitle>
          <AlertDescription>{block.description}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

import type { DiscussionThreadStatus } from "../types/domain.js";

export function threadAllowsComments(status?: DiscussionThreadStatus): boolean {
  return !status || status === "open";
}

export function threadAllowsReactions(status?: DiscussionThreadStatus): boolean {
  return status !== "closed" && status !== "archived";
}

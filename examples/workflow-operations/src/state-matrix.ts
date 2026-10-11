import type { WorkflowInstance, WorkflowStatus } from "@kamod-ch/otok-workflows";
import { TERMINAL_STATUSES } from "./types.js";

export function hasActiveLease(instance: WorkflowInstance, now: Date): boolean {
  return Boolean(instance.leaseToken && instance.leaseUntil && new Date(instance.leaseUntil).getTime() > now.getTime());
}

export function canPause(instance: WorkflowInstance, now: Date): boolean {
  if (TERMINAL_STATUSES.includes(instance.status)) return false;
  if (instance.status === "failed") return false;
  if (instance.status === "pending" && hasActiveLease(instance, now)) return false;
  return instance.status === "running" || instance.status === "waiting_approval" || instance.status === "pending";
}

export function canResume(instance: WorkflowInstance): boolean {
  return instance.status === "paused";
}

export function canApprove(instance: WorkflowInstance): boolean {
  return instance.status === "waiting_approval";
}

export function canCancel(instance: WorkflowInstance): boolean {
  if (TERMINAL_STATUSES.includes(instance.status)) return false;
  return (
    instance.status === "pending" ||
    instance.status === "running" ||
    instance.status === "paused" ||
    instance.status === "waiting_approval" ||
    instance.status === "failed"
  );
}

export function actionConflictReason(
  action: "pause" | "resume" | "approve" | "cancel",
  instance: WorkflowInstance,
  now: Date,
): string | null {
  switch (action) {
    case "pause":
      return canPause(instance, now) ? null : "invalid state for pause";
    case "resume":
      return canResume(instance) ? null : "invalid state for resume";
    case "approve":
      return canApprove(instance) ? null : "invalid state for approve";
    case "cancel":
      return canCancel(instance) ? null : "invalid state for cancel";
    default:
      return "unknown action";
  }
}

export function isTerminal(status: WorkflowStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

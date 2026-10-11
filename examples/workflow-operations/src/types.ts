import type { WorkflowStatus } from "@kamod-ch/otok-workflows";

export type OpsPermission = "workflow:read" | "workflow:operate" | "workflow:audit";

export interface OperatorSession {
  operatorId: string;
  permissions: OpsPermission[];
}

export interface AuditEntry {
  at: string;
  operatorId: string;
  instanceId: string;
  action: string;
  result: "ok" | "denied" | "error";
  detail?: string;
}

export const TERMINAL_STATUSES: WorkflowStatus[] = ["completed", "cancelled", "dead"];

export const MAX_LIST_LIMIT = 100;
export const DEFAULT_LIST_LIMIT = 50;

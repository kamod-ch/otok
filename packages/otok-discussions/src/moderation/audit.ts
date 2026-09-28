import type { ModerationAction, ModerationActionType } from "../types/domain.js";
import type { ModerationReasonCode } from "./reason-codes.js";

export interface ModerationAuditInput {
  tenantId: string;
  actorId: string;
  action: ModerationActionType;
  targetType: ModerationAction["targetType"];
  targetId: string;
  reasonCode: ModerationReasonCode | string;
  reasonText?: string;
  /** Extra immutable context (before/after status, thread id, …). */
  context?: Record<string, unknown>;
}

export function buildModerationAuditRecord(input: ModerationAuditInput): Omit<ModerationAction, "id" | "createdAt"> {
  return {
    tenantId: input.tenantId,
    actorId: input.actorId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: {
      reasonCode: input.reasonCode,
      ...(input.reasonText ? { reasonText: input.reasonText.slice(0, 2000) } : {}),
      ...(input.context ? { context: input.context } : {}),
      v: 1,
    },
  };
}

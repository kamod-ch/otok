import type { StepRecord, WorkflowInstance } from "@kamod-ch/otok-workflows";

const SENSITIVE_KEYS = ["password", "token", "secret", "apikey", "authorization", "cookie"];

function keySensitive(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((s) => lower.includes(s));
}

export function redactUnknown(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redactUnknown);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = keySensitive(k) ? "[REDACTED]" : redactUnknown(v);
  }
  return out;
}

export interface InstanceListItem {
  id: string;
  workflowName: string;
  status: string;
  progress: number;
  updatedAt: string;
  currentStep?: string;
  leaseOwner?: string;
  leaseUntil?: string;
  error?: string;
}

export function toListItem(instance: WorkflowInstance): InstanceListItem {
  return {
    id: instance.id,
    workflowName: instance.workflowName,
    status: instance.status,
    progress: instance.progress,
    updatedAt: instance.updatedAt,
    currentStep: instance.currentStep,
    leaseOwner: instance.leaseOwner,
    leaseUntil: instance.leaseUntil,
    error: instance.error,
  };
}

export interface InstanceDetail extends InstanceListItem {
  startedAt?: string;
  completedAt?: string;
  runAttempts?: number;
  input?: unknown;
  output?: unknown;
  metadata?: unknown;
}

export function toDetail(instance: WorkflowInstance, includeSecrets: boolean): InstanceDetail {
  const base = toListItem(instance);
  if (!includeSecrets) return base;
  return {
    ...base,
    startedAt: instance.startedAt,
    completedAt: instance.completedAt,
    runAttempts: instance.runAttempts,
    input: redactUnknown(instance.input),
    output: redactUnknown(instance.output),
    metadata: redactUnknown(instance.metadata),
  };
}

export interface StepListItem {
  stepName: string;
  status: string;
  attempt: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export function toStepItem(step: StepRecord): StepListItem {
  return {
    stepName: step.stepName,
    status: step.status,
    attempt: step.attempt,
    startedAt: step.startedAt,
    completedAt: step.completedAt,
    error: step.error,
  };
}

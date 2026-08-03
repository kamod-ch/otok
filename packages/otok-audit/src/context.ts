import { AsyncLocalStorage } from "node:async_hooks";
import type { AuditActor, AuditContext } from "./types.js";

const storage = new AsyncLocalStorage<AuditContext>();

export function withAuditContext<T>(context: AuditContext, fn: () => T): T {
  const parent = storage.getStore();
  return storage.run(
    {
      tenantId: context.tenantId ?? parent?.tenantId,
      actor: context.actor ?? parent?.actor,
      requestId: context.requestId ?? parent?.requestId,
      correlationId: context.correlationId ?? parent?.correlationId,
    },
    fn,
  );
}

export function getAuditContext(): AuditContext | undefined {
  return storage.getStore();
}

/** Bridge otok-observability request id into audit context. */
export function withAuditRequestId<T>(requestId: string, fn: () => T): T {
  const ctx = getAuditContext();
  return withAuditContext({ ...ctx, requestId }, fn);
}

export function withAuditActor<T>(actor: AuditActor, fn: () => T): T {
  const ctx = getAuditContext();
  return withAuditContext({ ...ctx, actor }, fn);
}

export function withAuditTenant<T>(tenantId: string, fn: () => T): T {
  const ctx = getAuditContext();
  return withAuditContext({ ...ctx, tenantId }, fn);
}

export function createCorrelationId(): string {
  return crypto.randomUUID();
}

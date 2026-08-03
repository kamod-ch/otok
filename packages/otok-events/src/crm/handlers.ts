import type { InProcessEventBus } from "../bus/event-bus.js";
import type { DomainEvent } from "../types.js";
import { childEventMetadata } from "../context.js";
import {
  activityLogged,
  companyCreated,
  notificationRequested,
  type ActivityLogged,
  type CompanyCreated,
} from "./events.js";

export interface CrmActivityStore {
  add(entry: { id: string; companyId: string; note: string; createdAt: string }): void;
  list(companyId: string): Array<{ id: string; companyId: string; note: string; createdAt: string }>;
}

export interface CrmSearchIndex {
  indexCompany(companyId: string, name: string, industry: string): void;
}

export interface CrmNotificationLog {
  push(entry: { companyId: string; channel: string; message: string; recipientId: string }): void;
  all(): Array<{ companyId: string; channel: string; message: string; recipientId: string }>;
}

export interface CrmHandlerDeps {
  activities: CrmActivityStore;
  search: CrmSearchIndex;
  notifications: CrmNotificationLog;
  defaultRecipientId?: string;
}

/** Register CRM event handlers: activities, search index, notifications. */
export function registerCrmEventHandlers(bus: InProcessEventBus, deps: CrmHandlerDeps): () => void {
  const unsubs = [
    bus.subscribe(companyCreated, async (event) => {
      await onCompanyCreated(event, deps, bus);
    }, { priority: 10, consumerName: "crm.activity" }),

    bus.subscribe(companyCreated, async (event) => {
      deps.search.indexCompany(event.payload.companyId, event.payload.name, event.payload.industry);
    }, { priority: 20, consumerName: "crm.search" }),

    bus.subscribe(companyCreated, async (event) => {
      await bus.publish(
        notificationRequested,
        {
          companyId: event.payload.companyId,
          channel: "in-app",
          message: `New company created: ${event.payload.name}`,
          recipientId: deps.defaultRecipientId ?? event.payload.createdBy,
        },
        childEventMetadata(event),
      );
    }, { priority: 30, mode: "async", consumerName: "crm.notify-on-create" }),

    bus.subscribe(notificationRequested, async (event) => {
      deps.notifications.push(event.payload);
    }, { consumerName: "crm.notifications" }),

    bus.subscribe(activityLogged, async (event) => {
      deps.activities.add({
        id: event.payload.activityId,
        companyId: event.payload.companyId,
        note: event.payload.note,
        createdAt: new Date().toISOString(),
      });
    }, { consumerName: "crm.activity-log" }),
  ];

  return () => unsubs.forEach((u) => u());
}

async function onCompanyCreated(
  event: DomainEvent<CompanyCreated>,
  deps: CrmHandlerDeps,
  bus: InProcessEventBus,
): Promise<void> {
  const activityId = `auto-${event.payload.companyId}`;
  await bus.publish(
    activityLogged,
    {
      activityId,
      companyId: event.payload.companyId,
      note: `Company "${event.payload.name}" created`,
      createdBy: event.payload.createdBy,
    },
    childEventMetadata(event),
  );
}

export type { CompanyCreated, ActivityLogged };

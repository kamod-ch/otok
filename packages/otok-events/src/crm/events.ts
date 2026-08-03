import { defineEvent, z } from "../define-event.js";

export const companyCreatedSchema = z.object({
  companyId: z.string(),
  name: z.string(),
  industry: z.string(),
  createdBy: z.string(),
});

export type CompanyCreated = z.infer<typeof companyCreatedSchema>;

export const companyCreated = defineEvent<CompanyCreated>({
  name: "company.created",
  version: 1,
  schema: companyCreatedSchema,
});

export const companyUpdatedSchema = z.object({
  companyId: z.string(),
  name: z.string(),
  industry: z.string(),
  updatedBy: z.string(),
});

export type CompanyUpdated = z.infer<typeof companyUpdatedSchema>;

export const companyUpdated = defineEvent<CompanyUpdated>({
  name: "company.updated",
  version: 1,
  schema: companyUpdatedSchema,
});

export const activityLoggedSchema = z.object({
  activityId: z.string(),
  companyId: z.string(),
  note: z.string(),
  createdBy: z.string(),
});

export type ActivityLogged = z.infer<typeof activityLoggedSchema>;

export const activityLogged = defineEvent<ActivityLogged>({
  name: "activity.logged",
  version: 1,
  schema: activityLoggedSchema,
});

export const notificationRequestedSchema = z.object({
  companyId: z.string(),
  channel: z.enum(["email", "in-app"]),
  message: z.string(),
  recipientId: z.string(),
});

export type NotificationRequested = z.infer<typeof notificationRequestedSchema>;

export const notificationRequested = defineEvent<NotificationRequested>({
  name: "notification.requested",
  version: 1,
  schema: notificationRequestedSchema,
  redactFields: ["recipientId"],
});

export const crmEvents = {
  companyCreated,
  companyUpdated,
  activityLogged,
  notificationRequested,
};

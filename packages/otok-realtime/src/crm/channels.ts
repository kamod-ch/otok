import { defineChannel, z } from "../define-channel.js";

export const companyActivitySchema = z.object({
  activityId: z.string(),
  companyId: z.string(),
  note: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export type CompanyActivityEvent = z.infer<typeof companyActivitySchema>;

export const companiesChannel = defineChannel<CompanyActivityEvent>({
  name: "companies",
  schema: companyActivitySchema,
  authorize: ({ user, room }) => Boolean(user?.id && room),
});

export const presenceSchema = z.object({
  userId: z.string(),
  status: z.enum(["online", "away", "offline"]),
  companyId: z.string(),
});

export type CrmPresenceEvent = z.infer<typeof presenceSchema>;

export const crmPresenceChannel = defineChannel<CrmPresenceEvent>({
  name: "crm-presence",
  schema: presenceSchema,
  authorize: ({ user }) => Boolean(user),
});

export const crmChannels = {
  companies: companiesChannel,
  presence: crmPresenceChannel,
};

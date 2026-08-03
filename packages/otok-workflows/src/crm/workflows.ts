import { defineWorkflow, z } from "../define-workflow.js";

export const companyInputSchema = z.object({
  companyId: z.string(),
  name: z.string(),
  domain: z.string().optional(),
  notifyEmail: z.string().email().optional(),
});

export type CompanyInput = z.infer<typeof companyInputSchema>;

export const enrichCompanyOutputSchema = z.object({
  website: z.string().optional(),
  contacts: z.array(z.object({ name: z.string(), email: z.string().email() })),
  notified: z.boolean(),
});

export type EnrichCompanyOutput = z.infer<typeof enrichCompanyOutputSchema>;

/** CRM workflow: import → find website → enrich contacts → notify. */
export const enrichCompany = defineWorkflow({
  name: "company.enrich",
  input: companyInputSchema,
  output: enrichCompanyOutputSchema,
  redactFields: ["notifyEmail"],
  compensate: async ({ completedSteps }) => {
    void completedSteps;
    // e.g. rollback imported records, revoke notifications
  },
  run: async ({ input, step }) => {
    await step.run("import-company", async () => ({
      companyId: input.companyId,
      imported: true,
    }));

    const website = await step.run("find-website", async () => {
      if (input.domain) return `https://${input.domain}`;
      return `https://${input.name.toLowerCase().replace(/\s+/g, "")}.example.com`;
    });

    const contacts = await step.run("find-contacts", async () => {
      return [
        { name: "Sales", email: `sales@${input.domain ?? "example.com"}` },
        { name: "Info", email: `info@${input.domain ?? "example.com"}` },
      ];
    });

    const notified = await step.run("notify-team", async () => {
      return Boolean(input.notifyEmail);
    });

    return { website, contacts, notified };
  },
});

export const crmWorkflows = {
  enrichCompany,
};

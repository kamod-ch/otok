import type { CloudWorkflowProviderContract, WorkflowDefinition } from "../types.js";

export function defineCloudWorkflowProvider(options: {
  providerName: string;
  integrationNotes?: string[];
}): CloudWorkflowProviderContract {
  return {
    providerName: options.providerName,
    async deployWorkflow(definition: WorkflowDefinition) {
      return { deploymentId: `${options.providerName}:${definition.name}` };
    },
    async invoke(instanceId: string) {
      void instanceId;
    },
    integrationNotes: options.integrationNotes ?? [
      "Export workflow definitions as JSON schema for cloud deployment.",
      "Map step.run boundaries to cloud activity/task boundaries.",
      "Ensure step outputs are persisted in cloud-native storage for replay.",
      "Wire cron triggers to cloud scheduler (EventBridge, Cloud Scheduler, etc.).",
    ],
  };
}

export type { CloudWorkflowProviderContract };

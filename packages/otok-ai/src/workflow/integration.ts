/** Workflow integration helpers for long-running AI jobs. */
export interface AiWorkflowJobInput {
  workflowName: string;
  payload: Record<string, unknown>;
  userId?: string;
  orgId?: string;
}

export interface AiWorkflowClient {
  start(input: AiWorkflowJobInput): Promise<{ jobId: string }>;
}

/**
 * Bridge otok-ai with otok-workflows when both plugins are registered.
 * Returns null if workflows runtime is unavailable.
 */
export async function createAiWorkflowClient(): Promise<AiWorkflowClient | null> {
  try {
    const { getWorkflowRuntime } = await import("@kamod-ch/otok-workflows");
    const engine = getWorkflowRuntime();
    return {
      async start(input) {
        const definition = engine.getDefinition(input.workflowName);
        if (!definition) {
          throw new Error(`Unknown workflow "${input.workflowName}"`);
        }
        const instance = await engine.start(definition, input.payload);
        return { jobId: instance.id };
      },
    };
  } catch {
    return null;
  }
}

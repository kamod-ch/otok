import type { RenderPlan } from "./types.js";

export interface AdapterRenderCapabilities {
  ssr: boolean;
  streaming: boolean;
  prerender: boolean;
}

export function assertRenderCapability(
  plan: RenderPlan,
  capabilities: AdapterRenderCapabilities,
  routePath: string,
): void {
  if (plan.mode === "ssr" && !capabilities.ssr) {
    throw new Error(`[otok:rendering] Route "${routePath}" requires SSR but the active adapter does not support it.`);
  }
  if (plan.mode === "ssg" && !capabilities.prerender && !capabilities.ssr) {
    throw new Error(`[otok:rendering] Route "${routePath}" requires prerender/SSG but the active adapter does not support it.`);
  }
  if (plan.streaming && !capabilities.streaming) {
    throw new Error(`[otok:rendering] Route "${routePath}" requires streaming SSR but the active adapter does not support it.`);
  }
}

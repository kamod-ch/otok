import { OtokStripeConfigError } from "./errors.js";
import type { StripeProvider, StripeProviderConfig } from "./provider/types.js";
import { createLiveStripeProvider } from "./providers/live.js";
import { createTestStripeProvider } from "./providers/test.js";

export function createStripeProvider<TPlan extends string = string>(
  config: StripeProviderConfig,
): StripeProvider<TPlan> {
  switch (config.type) {
    case "live":
      return createLiveStripeProvider<TPlan>(config);
    case "test":
      return createTestStripeProvider<TPlan>();
    default: {
      const unknown = config as { type?: string };
      throw new OtokStripeConfigError(`unknown stripe provider "${unknown.type ?? "undefined"}"`);
    }
  }
}

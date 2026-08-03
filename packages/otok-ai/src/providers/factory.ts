import type { AiProvider, AiProviderFactoryConfig } from "../types.js";
import { OtokAiConfigError } from "../errors.js";
import { createTestProvider } from "./test.js";
import { createOpenAiProvider } from "./openai.js";

export function createAiProvider(config: AiProviderFactoryConfig): AiProvider {
  switch (config.type) {
    case "test":
      return createTestProvider();
    case "openai":
      return createOpenAiProvider(config);
    default:
      throw new OtokAiConfigError(`Unknown AI provider type: ${(config as { type: string }).type}`);
  }
}

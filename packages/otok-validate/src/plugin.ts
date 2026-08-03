import { definePlugin } from "otok";

export type ValidatePluginOptions = Record<string, never> | void;

const validatePluginFactory = definePlugin({
  name: "@kamod-ch/otok-validate",
  version: "1.0.0",
});

/**
 * Marker plugin so `otok add validate` can register Zod helpers in `otok.config.ts`.
 * Composition APIs remain available via named imports from `@kamod-ch/otok-validate`.
 *
 * ```ts
 * import validate from "@kamod-ch/otok-validate";
 * export default defineConfig({ plugins: [validate()] });
 * ```
 */
export default function validate(_options?: ValidatePluginOptions) {
  return validatePluginFactory();
}

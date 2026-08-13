import { definePlugin } from "@kamod-ch/otok";

export type ValidationPluginOptions = Record<string, never> | void;

const validationPluginFactory = definePlugin({
  name: "@kamod-ch/otok-validation",
  version: "1.0.0",
});

/**
 * Marker plugin so `otok add validation` can register Standard Schema helpers in `otok.config.ts`.
 * Composition APIs remain available via named imports from `@kamod-ch/otok-validation`.
 *
 * ```ts
 * import validation from "@kamod-ch/otok-validation";
 * export default defineConfig({ plugins: [validation()] });
 * ```
 */
export default function validation(_options?: ValidationPluginOptions) {
  return validationPluginFactory();
}

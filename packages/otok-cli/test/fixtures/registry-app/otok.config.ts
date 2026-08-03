import kysely from "@kamod-ch/otok-kysely";

export default defineConfig({
  plugins: [kysely()],
});

function defineConfig<T>(config: T): T {
  return config;
}

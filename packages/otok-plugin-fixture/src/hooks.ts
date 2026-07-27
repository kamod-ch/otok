export interface FixtureHookLog {
  phase: string;
  plugin: string;
}

const globalKey = "__OTOK_PLUGIN_FIXTURE_LOG__";

export function readFixtureHookLog(): FixtureHookLog[] {
  const target = globalThis as typeof globalThis & { [globalKey]?: FixtureHookLog[] };
  if (!target[globalKey]) target[globalKey] = [];
  return target[globalKey]!;
}

export function resetFixtureHookLog(): void {
  const target = globalThis as typeof globalThis & { [globalKey]?: FixtureHookLog[] };
  target[globalKey] = [];
}

export function recordFixtureHook(phase: string, plugin = "otok-plugin-fixture"): void {
  readFixtureHookLog().push({ phase, plugin });
}

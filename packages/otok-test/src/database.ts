export interface TestDatabaseHooks {
  setup?: () => void | Promise<void>;
  cleanup?: () => void | Promise<void>;
}

export async function withTestDatabase<T>(hooks: TestDatabaseHooks, run: () => Promise<T>): Promise<T> {
  if (hooks.setup) await hooks.setup();
  try {
    return await run();
  } finally {
    if (hooks.cleanup) await hooks.cleanup();
  }
}

export function createDatabaseTestHooks(setup: TestDatabaseHooks["setup"], cleanup: TestDatabaseHooks["cleanup"]) {
  return { setup, cleanup } satisfies TestDatabaseHooks;
}

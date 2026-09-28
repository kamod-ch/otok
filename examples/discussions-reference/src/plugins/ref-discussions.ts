import { definePlugin } from "@kamod-ch/otok";
import discussionsPlugin from "@kamod-ch/otok-discussions/plugin";
import { ensureRefDb } from "../db/client.js";
import { buildDiscussionsOptions } from "../lib/discussions-wiring.js";

const factory = definePlugin({
  name: "discussions-reference-discussions",
  version: "0.1.0",
  schema: {
    parse() {
      return {};
    },
  },
});

export default function refDiscussions() {
  const shell = factory({});
  let inner: ReturnType<typeof discussionsPlugin> | null = null;

  async function loadInner() {
    if (inner) return inner;
    const db = await ensureRefDb();
    inner = discussionsPlugin(buildDiscussionsOptions(() => db));
    return inner;
  }

  shell.registerRoutes = async (ctx) => {
    const plugin = await loadInner();
    return plugin.registerRoutes?.(ctx) ?? [];
  };

  shell.configureApp = async (ctx) => {
    const plugin = await loadInner();
    await plugin.configureApp?.(ctx);
  };

  return shell;
}

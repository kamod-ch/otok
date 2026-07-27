import { defineSetup, type PluginSetupHook } from "otok";

const setup: PluginSetupHook = defineSetup(() => ({
  changes: [
    {
      kind: "append-file",
      path: ".env.example",
      content: "\n# @otok/plugin-fixture\nFIXTURE_PREFIX=fixture\n",
    },
    {
      kind: "mkdir",
      path: "config/fixture",
    },
  ],
}));

export default setup;

import { defineSetup, type PluginSetupHook } from "@kamod-ch/otok";

const setup: PluginSetupHook = defineSetup(() => ({
  changes: [
    {
      kind: "append-file",
      path: ".env.example",
      content: "\n# @kamod-ch/otok-plugin-fixture\nFIXTURE_PREFIX=fixture\n",
    },
    {
      kind: "mkdir",
      path: "config/fixture",
    },
  ],
}));

export default setup;

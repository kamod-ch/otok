import { definePlugin } from "otok";

export interface HelloPluginOptions {
  message?: string;
}

export default definePlugin<HelloPluginOptions>({
  name: "otok-plugin-hello",
  version: "0.1.0",
  configureApp({ app }) {
    app.get("/api/plugin/hello", (c) =>
      c.json({
        ok: true,
        message: "hello from otok-plugin-hello",
      }),
    );
  },
});

export { definePlugin } from "otok";

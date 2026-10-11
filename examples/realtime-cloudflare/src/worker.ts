import {
  RealtimeRoom,
  createCloudflareRealtimeApp,
  routeSegments,
  type CloudflareRealtimeWorkerEnv,
} from "@kamod-ch/otok-realtime/cloudflare";

export { RealtimeRoom };

export default {
  fetch(request: Request, env: CloudflareRealtimeWorkerEnv): Response | Promise<Response> {
    const app = createCloudflareRealtimeApp(env, {
      authorizeSubscribe: ({ channel }) => channel !== "deny",
      authorizePublish: ({ channel }) => channel !== "deny",
      resolveUserId: (c) => c.req.header("x-test-user") ?? "test-user",
    });
    return app.fetch(request);
  },
};

export { routeSegments };

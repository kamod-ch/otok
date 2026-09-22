import { createServer, type Server } from "node:http";

export interface WorkerHealthState {
  ready: boolean;
  busy: number;
}

export function createWorkerHealth(): WorkerHealthState {
  return { ready: false, busy: 0 };
}

export function startWorkerHealthServer(state: WorkerHealthState, port: number): Server {
  const server = createServer((req, res) => {
    if (req.url === "/healthz" || req.url === "/livez") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
      return;
    }
    if (req.url === "/readyz") {
      if (state.ready) {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("ready");
      } else {
        res.writeHead(503, { "content-type": "text/plain" });
        res.end("not ready");
      }
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(port);
  return server;
}

#!/usr/bin/env node
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port = Number(process.env.SMOKE_PORT ?? 4179);
const baseUrl = `http://127.0.0.1:${port}`;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
    child.on("error", reject);
  });
}

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // server not ready yet
    }
    await delay(250);
  }
  throw new Error("Timed out waiting for production server");
}

async function expectResponse(path, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`);
  if (response.status !== expectedStatus) {
    throw new Error(`${path} returned ${response.status}, expected ${expectedStatus}`);
  }
  return response;
}

function assetPathFromHtml(html) {
  const stylesheet = /<link rel="stylesheet" href="([^"]+)">/.exec(html)?.[1];
  if (stylesheet) return stylesheet;
  const script = /<script type="module" src="([^"]+)"><\/script>/.exec(html)?.[1];
  if (script) return script;
  throw new Error("Could not find a built asset in production HTML");
}

let server;
try {
  await run("pnpm", ["--filter", "playground", "build"]);

  server = spawn("node", ["dist/server/server.js"], {
    cwd: "apps/playground",
    env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", NODE_ENV: "production" },
    stdio: ["ignore", "inherit", "inherit"],
  });

  await waitForServer();

  const health = await expectResponse("/api/health", 200);
  const healthJson = await health.json();
  if (healthJson.ok !== true) throw new Error("Health endpoint did not return ok=true");

  const htmlResponse = await expectResponse("/", 200);
  const html = await htmlResponse.text();
  if (!html.includes("Dashboard")) throw new Error("Production HTML route did not render dashboard content");

  const assetPath = assetPathFromHtml(html);
  const asset = await expectResponse(assetPath, 200);
  const cacheControl = asset.headers.get("cache-control") ?? "";
  if (!cacheControl.includes("max-age")) throw new Error("Static asset response is missing Cache-Control");

  await expectResponse("/missing-smoke-route", 404);

  console.log("Production smoke test passed.");
} finally {
  if (server && !server.killed) {
    server.kill("SIGTERM");
    await delay(250);
    if (!server.killed) server.kill("SIGKILL");
  }
}

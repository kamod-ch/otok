import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { setTimeout as sleep } from "node:timers/promises";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number.parseInt(process.env.REALTIME_CF_TEST_PORT ?? "18788", 10);
const base = `http://127.0.0.1:${port}`;

function routeSegments(channel, room) {
  const enc = (s) => Buffer.from(s, "utf8").toString("base64url");
  return { channelB64: enc(channel), roomB64: enc(room) };
}

async function readSseUntil(text, res, maxBytes = 16_000) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (buf.length < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    if (buf.includes(text)) break;
  }
  await reader.cancel().catch(() => undefined);
  return buf;
}

function signalWrangler(proc, signal) {
  try {
    if (process.platform === "win32") proc.kill(signal);
    else process.kill(-proc.pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

async function stopWrangler(proc) {
  if (proc.exitCode !== null || proc.signalCode !== null) return;
  const exited = once(proc, "exit");
  signalWrangler(proc, "SIGTERM");
  await Promise.race([exited, sleep(5_000, undefined, { ref: false })]);
  if (proc.exitCode === null && proc.signalCode === null) {
    signalWrangler(proc, "SIGKILL");
    await Promise.race([exited, sleep(1_000, undefined, { ref: false })]);
  }
}

async function startWrangler() {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), "realtime-cloudflare-"));
  const wrangler = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "wrangler.cmd" : "wrangler");
  const proc = spawn(wrangler, ["dev", "--port", String(port), "--local-protocol", "http", "--persist-to", stateDir], {
    cwd: root,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "0" },
  });

  let output = "";
  let spawnError;
  const onData = (chunk) => {
    output = (output + chunk.toString()).slice(-16_000);
  };
  proc.on("error", (error) => {
    spawnError = error;
  });
  proc.stdout.on("data", onData);
  proc.stderr.on("data", onData);

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (spawnError || proc.exitCode !== null || proc.signalCode !== null) {
      await rm(stateDir, { recursive: true, force: true });
      throw new Error(
        `wrangler dev failed${spawnError ? `: ${spawnError.message}` : ` with code ${proc.exitCode}`}\n${output}`,
      );
    }
    try {
      await fetch(base, { signal: AbortSignal.timeout(1_000) });
      return { proc, stateDir };
    } catch {
      await sleep(250);
    }
  }

  await stopWrangler(proc);
  await rm(stateDir, { recursive: true, force: true });
  throw new Error(`wrangler dev did not become ready\n${output}`);
}

test("cloudflare realtime integration", { timeout: 120_000 }, async (t) => {
  const { proc, stateDir } = await startWrangler();
  t.after(async () => {
    await stopWrangler(proc);
    await rm(stateDir, { recursive: true, force: true });
  });

  await t.test("denies publish on deny channel", async () => {
    const { channelB64, roomB64 } = routeSegments("deny", "r1");
    const res = await fetch(`${base}/realtime/publish/${channelB64}/${roomB64}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-realtime-publish-secret": "local-publish-secret",
      },
      body: JSON.stringify({ type: "x", data: {} }),
    });
    assert.equal(res.status, 403);
  });

  await t.test("publish and live SSE", async () => {
    const { channelB64, roomB64 } = routeSegments("orders", "live-2");
    const sseRes = await fetch(`${base}/realtime/sse/${channelB64}/${roomB64}`, {
      headers: { "x-test-user": "u1" },
    });
    assert.equal(sseRes.status, 200);

    const pub = await fetch(`${base}/realtime/publish/${channelB64}/${roomB64}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-realtime-publish-secret": "local-publish-secret",
      },
      body: JSON.stringify({ type: "order.created", data: { id: 2 } }),
    });
    assert.equal(pub.status, 202);

    const chunk = await readSseUntil("order.created", sseRes);
    assert.match(chunk, /id: 1/);
  });

  await t.test("unknown last-event-id emits gap", async () => {
    const { channelB64, roomB64 } = routeSegments("orders", "gap-2");
    await fetch(`${base}/realtime/publish/${channelB64}/${roomB64}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-realtime-publish-secret": "local-publish-secret",
      },
      body: JSON.stringify({ type: "a", data: {} }),
    });
    const res = await fetch(`${base}/realtime/sse/${channelB64}/${roomB64}`, {
      headers: { "x-test-user": "u1", "last-event-id": "9999" },
    });
    const body = await readSseUntil("UNKNOWN_EVENT_ID", res);
    assert.match(body, /UNKNOWN_EVENT_ID/);
  });
});

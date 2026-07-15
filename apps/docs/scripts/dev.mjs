#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT ?? 4321);

spawnSync(process.execPath, [path.join(root, "scripts/build.mjs")], { stdio: "inherit" });

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  let file = path.join(root, "dist", url.pathname.replace(/^\/otok\/?/, ""));
  if (url.pathname.endsWith("/")) file = path.join(file, "index.html");
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, "dist", "404.html");
  const type = file.endsWith(".css") ? "text/css" : file.endsWith(".js") ? "text/javascript" : file.endsWith(".xml") ? "application/xml" : "text/html";
  res.writeHead(file.endsWith("404.html") ? 404 : 200, { "content-type": `${type}; charset=utf-8` });
  res.end(fs.readFileSync(file));
});

server.listen(port, () => {
  console.info(`Otok docs running at http://localhost:${port}/otok/`);
});

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestDir = path.join(root, "dist", "client", ".vite");
const manifestPath = path.join(manifestDir, "manifest.json");

if (!fs.existsSync(manifestPath)) {
  fs.mkdirSync(manifestDir, { recursive: true });
  fs.writeFileSync(manifestPath, "{}\n");
  console.log("Created stub client manifest for typecheck:", manifestPath);
}

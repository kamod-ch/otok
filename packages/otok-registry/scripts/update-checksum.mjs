import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const v1 = path.join(root, "registry", "v1");
const bundlePath = path.join(v1, "extensions.json");
const indexPath = path.join(v1, "index.json");

const bundleRaw = fs.readFileSync(bundlePath, "utf8");
const checksum = `sha256:${createHash("sha256").update(bundleRaw, "utf8").digest("hex")}`;

const index = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  checksum,
  extensionsUrl: "./extensions.json",
  publishers: [
    {
      id: "kamod-ch",
      name: "Kamod",
      verified: true,
      url: "https://github.com/kamod-ch",
    },
    {
      id: "community-example",
      name: "Community Example",
      verified: false,
    },
  ],
  reviewPolicyUrl: "https://github.com/kamod-ch/otok/blob/main/packages/otok-registry/docs/publishers.md",
  abuseContact: "security@kamod.ch",
};

fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
console.log(`Updated ${indexPath} checksum: ${checksum}`);

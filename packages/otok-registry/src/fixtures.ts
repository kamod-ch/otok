import path from "node:path";
import { fileURLToPath } from "node:url";

export function bundledRegistryFixturePath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const packageRoot = path.resolve(here, "..");
  return path.join(packageRoot, "registry", "v1");
}

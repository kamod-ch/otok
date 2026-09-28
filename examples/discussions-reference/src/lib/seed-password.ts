import { scryptSync } from "node:crypto";
import { REFERENCE_PASSWORD } from "./test-users.js";

/** Deterministic hash for reproducible seeds (salt fixed). */
export function referencePasswordHash(): string {
  const salt = "discussions-reference-seed-v1";
  const derived = scryptSync(REFERENCE_PASSWORD, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

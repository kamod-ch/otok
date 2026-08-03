import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { IncrementalState } from "./types.js";

const STATE_FILE = ".otok-content-state.json";

export function incrementalStatePath(root: string): string {
  return path.join(root, STATE_FILE);
}

export function readIncrementalState(root: string): IncrementalState {
  const file = incrementalStatePath(root);
  if (!fs.existsSync(file)) {
    return { version: 1, files: {} };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as IncrementalState;
    if (parsed.version === 1 && parsed.files) return parsed;
  } catch {
    /* ignore corrupt state */
  }
  return { version: 1, files: {} };
}

export function writeIncrementalState(root: string, state: IncrementalState): void {
  fs.writeFileSync(incrementalStatePath(root), JSON.stringify(state, null, 2));
}

export function fileFingerprint(file: string): { hash: string; mtimeMs: number } {
  const stat = fs.statSync(file);
  const content = fs.readFileSync(file);
  const hash = createHash("sha256").update(content).digest("hex");
  return { hash, mtimeMs: stat.mtimeMs };
}

export function isFileUnchanged(
  state: IncrementalState,
  file: string,
): boolean {
  const prev = state.files[file];
  if (!prev) return false;
  try {
    const next = fileFingerprint(file);
    return prev.hash === next.hash && prev.mtimeMs === next.mtimeMs;
  } catch {
    return false;
  }
}

export function updateIncrementalState(
  state: IncrementalState,
  files: string[],
): IncrementalState {
  const next: IncrementalState = { version: 1, files: { ...state.files } };
  for (const file of files) {
    try {
      next.files[file] = fileFingerprint(file);
    } catch {
      delete next.files[file];
    }
  }
  return next;
}

import { execFileSync } from "node:child_process";
import type { GitTimestamps } from "./types.js";

export function gitTimestampsForFile(file: string): GitTimestamps | undefined {
  try {
    const createdAt = execFileSync("git", ["log", "--follow", "--format=%aI", "--reverse", file], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .trim()
      .split("\n")[0];

    const updatedAt = execFileSync("git", ["log", "-1", "--format=%aI", file], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    return {
      createdAt: createdAt || undefined,
      updatedAt: updatedAt || undefined,
    };
  } catch {
    return undefined;
  }
}

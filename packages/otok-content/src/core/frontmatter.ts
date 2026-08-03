import fs from "node:fs";
import matter from "gray-matter";

export interface ParsedFrontmatter {
  meta: Record<string, unknown>;
  body: string;
}

export function readFrontmatter(file: string): ParsedFrontmatter {
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);
  return {
    meta: data as Record<string, unknown>,
    body: content,
  };
}

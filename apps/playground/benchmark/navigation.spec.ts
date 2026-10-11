import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const resultsDir = join(repoRoot, "benchmarks/results");

function percentileNearestRank(samples: number[], p: number) {
  const sorted = [...samples].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))];
}

test("soft navigation between dashboard and about", async ({ page }) => {
  const durations: number[] = [];
  let errors = 0;

  await page.goto("/");
  await expect(page.getByText("Dashboard")).toBeVisible();
  await page.getByRole("button", { name: "Increment" }).click();
  await expect(page.getByText(/Count:\s*1/)).toBeVisible();

  for (let i = 0; i < 30; i += 1) {
    const target = i % 2 === 0 ? "/about" : "/";
    const marker = target === "/about" ? "Zero JS" : "Dashboard";
    const t0 = performance.now();
    try {
      await page.click(`a[href="${target}"]`);
      await page.waitForURL(`**${target}`);
      await expect(page.getByText(marker)).toBeVisible();
      durations.push(performance.now() - t0);
    } catch {
      errors += 1;
    }
  }

  const freshAbout = await page.request.get("/about", { headers: { "cache-control": "no-cache" } });
  const aboutHtml = await freshAbout.text();
  expect(aboutHtml).toContain("Zero JS");
  expect(aboutHtml).not.toMatch(/<script[^>]*type=["']module["']/i);

  const report = {
    softNavigationReadyP50Ms: percentileNearestRank(durations, 50),
    softNavigationReadyP95Ms: percentileNearestRank(durations, 95),
    navigationErrors: errors,
    samples: durations.length,
    note: "Browser-observed navigation readiness (not SSR network latency)",
  };

  mkdirSync(resultsDir, { recursive: true });
  writeFileSync(join(resultsDir, "navigation.json"), `${JSON.stringify(report, null, 2)}\n`);
  expect(errors).toBe(0);
  expect(durations.length).toBeGreaterThanOrEqual(30);
});

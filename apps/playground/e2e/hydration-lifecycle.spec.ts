import { expect, test } from "@playwright/test";

async function readCleanupCalls(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => window.__otokCleanupCalls ?? 0);
}

test.describe("hydration lifecycle", () => {
  test("removed load island runs Preact cleanup exactly once", async ({ page }) => {
    await page.goto("/hydration-lifecycle");
    const probe = page.locator('[data-otok-island="CleanupProbe"][data-otok-strategy="load"]');
    await expect(probe).toHaveAttribute("data-otok-hydrated", "true");
    await expect(page.getByTestId("cleanup-probe")).toBeVisible();
    await expect.poll(async () => page.evaluate(() => window.__otokProbeLive === true)).toBe(true);

    await page.getByRole("link", { name: "Zero-JS route" }).first().click();
    await expect(page).toHaveURL("/about");
    await expect(page.getByTestId("cleanup-probe")).toHaveCount(0);
    await expect.poll(() => readCleanupCalls(page)).toBe(1);
    await expect.poll(async () => page.evaluate(() => window.__otokProbeLive === true)).toBe(false);
  });

  test("rapid navigation does not double-hydrate load probe", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Hydration lifecycle" }).first().click();
    await expect(page).toHaveURL("/hydration-lifecycle");
    await page.getByRole("link", { name: "Dashboard" }).first().click();
    await page.getByRole("link", { name: "Hydration lifecycle" }).first().click();
    await expect(page.locator('[data-otok-island="CleanupProbe"][data-otok-strategy="load"]')).toHaveAttribute(
      "data-otok-hydrated",
      "true",
    );
    await page.getByRole("link", { name: "Zero-JS route" }).first().click();
    await expect.poll(() => readCleanupCalls(page)).toBeGreaterThanOrEqual(1);
  });

  test("deferred idle island hydrates after soft navigation completes", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("link", { name: "Island strategies" }).first().click();
    await expect(page).toHaveURL("/strategies");
    await expect(page.getByRole("heading", { level: 2, name: "Island strategies" })).toBeVisible();
    const idle = page.locator('[data-otok-island="StrategyLab"]').filter({ hasText: "idle" }).first();
    await expect(idle).toHaveAttribute("data-otok-hydrated", "true", { timeout: 15_000 });
  });

  test("never-matching media island stays unhydrated", async ({ page }) => {
    await page.goto("/strategies");
    const never = page.locator('[data-otok-island="StrategyLab"]').filter({ hasText: "media never" }).first();
    await expect(never).toHaveAttribute("data-otok-strategy", "media");
    await expect(never).not.toHaveAttribute("data-otok-hydrated", "true");
    await page.waitForTimeout(500);
    await expect(never).not.toHaveAttribute("data-otok-hydrated", "true");
  });
});

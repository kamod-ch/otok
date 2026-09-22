import { test, expect } from "@playwright/test";

test.describe("Devjobs reference a11y smoke", () => {
  test("jobs list keyboard focus and narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/jobs");
    await expect(page.getByRole("heading", { name: /Stellen|Open positions/i })).toBeVisible();
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
  });

  test("login form labels", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
  });
});

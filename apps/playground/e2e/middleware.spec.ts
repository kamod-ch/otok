import { expect, test } from "@playwright/test";

test("route middleware redirects unauthenticated requests", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/projects$/);
});

test("route middleware provides context values to loaders", async ({ page }) => {
  await page.goto("/admin?demoUser=1");
  await expect(page.getByRole("heading", { name: "Protected admin", level: 2 })).toBeVisible();
  await expect(page.getByText("Hello Demo User")).toBeVisible();
});

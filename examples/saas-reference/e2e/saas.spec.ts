import { test, expect } from "@playwright/test";

test.describe("Otok SaaS reference", () => {
  test("register, create org, dashboard", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;

    await page.goto("/register");
    await page.fill('input[name="name"]', "E2E User");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "test-password-123");
    await page.getByRole("button", { name: /Registrieren|Register/i }).click();
    await expect(page).toHaveURL(/\/org\/new/);

    await page.fill('input[name="name"]', "E2E Org");
    await page.getByRole("button", { name: /Erstellen|Create/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/E2E Org/)).toBeVisible();
  });

  test("demo login and billing page", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "demo@example.com");
    await page.fill('input[name="password"]', "demo-password");
    await page.getByRole("button", { name: /Weiter|Continue/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/dashboard/billing");
    await expect(page.getByText(/free|Free/i)).toBeVisible();
  });
});

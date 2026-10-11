import { test, expect } from "@playwright/test";

test.describe("workflow-operations e2e", () => {
  test("login and list without JavaScript", async ({ page, context }) => {
    await context.route("**/*", (route) => route.continue());
    await page.goto("/login");
    await page.fill('input[name="password"]', "e2e-operator-password");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/ops\/workflows\/instances/);
    await expect(page.locator("h1")).toContainText("Workflow operations");
  });

  test("keyboard can submit login form", async ({ page }) => {
    await page.goto("/login");
    await page.focus('input[name="password"]');
    await page.keyboard.type("e2e-operator-password");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/ops\/workflows\/instances/);
  });
});

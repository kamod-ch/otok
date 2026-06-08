import { expect, test } from "@playwright/test";

test("static routes ship no module script", async ({ request }) => {
  const response = await request.get("/about");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain("This route has no islands.");
  expect(html).not.toContain('<script type="module"');
});

test("counter island hydrates independently", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Count: 5")).toBeVisible();
  await page.getByRole("button", { name: "Increment" }).click();
  await expect(page.getByText("Count: 6")).toBeVisible();
});

test("dynamic route params are loaded on the server", async ({ page }) => {
  await page.goto("/users/alice");
  await expect(page.getByText("Loaded user id: alice")).toBeVisible();
});

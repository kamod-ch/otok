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

test("dashboard navigation reaches zero-js route", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Zero-JS route" }).first().click();
  await expect(page).toHaveURL("/about");
  await expect(page.getByText("This route has no islands.")).toBeVisible();
});

test("catch-all routes expose slash-preserving params", async ({ page }) => {
  await page.goto("/docs/routing/catch-all");
  await expect(page.getByText("Loaded docs slug: routing/catch-all")).toBeVisible();
});

test("not-found routes render with 404 status", async ({ request }) => {
  const response = await request.get("/missing");
  expect(response.status()).toBe(404);
  expect(await response.text()).toContain("Page not found");
});

test("error routes render with 500 status", async ({ request }) => {
  const response = await request.get("/boom");
  expect(response.status()).toBe(500);
  expect(await response.text()).toContain("Boom from loader");
});

test("visible strategy islands hydrate when observed", async ({ page }) => {
  await page.goto("/");
  const teamIsland = page.locator('[data-otok-island="TeamMembers"]');

  await expect(teamIsland).toHaveAttribute("data-otok-strategy", "visible");
  await expect(teamIsland).toHaveAttribute("data-otok-hydrated", "true");
});

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

test("soft navigation swaps page content and updates heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.getByRole("link", { name: "kamod-ui islands" }).first().click();
  await expect(page).toHaveURL("/demo");
  await expect(page.getByRole("heading", { name: "kamod-ui islands" })).toBeVisible();
  await expect(page.getByText("Dialog and theme interactions are isolated islands.")).toBeVisible();
});

test("soft navigation reaches zero-js route", async ({ page }) => {
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

test("all island strategies hydrate and do not double hydrate", async ({ page }) => {
  await page.goto("/strategies");

  const strategies = ["load", "idle", "visible", "media", "client-only", "large props"];
  for (const label of strategies) {
    const island = page.locator('[data-otok-island="StrategyLab"]').filter({ hasText: label }).first();
    await expect(island).toHaveAttribute("data-otok-hydrated", "true");
    await island.getByRole("button", { name: new RegExp(`${label} count 0`) }).click();
    await expect(island.getByRole("button", { name: new RegExp(`${label} count 1`) })).toBeVisible();
  }

  await expect(page.locator('script[type="application/json"][data-otok-props-for]')).toHaveCount(1);
  await expect(page.getByText("Payload length: 2600")).toBeVisible();
});

test("new islands hydrate after soft navigation and removed islands disappear", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator("[data-otok-island]")).toHaveCount(0);

  await page.getByRole("link", { name: "Island strategies" }).first().click();
  await expect(page).toHaveURL("/strategies");
  await expect(page.locator('[data-otok-island="StrategyLab"]').first()).toHaveAttribute("data-otok-hydrated", "true");

  await page.getByRole("link", { name: "Zero-JS route" }).first().click();
  await expect(page).toHaveURL("/about");
  await expect(page.locator("[data-otok-island]")).toHaveCount(0);
});

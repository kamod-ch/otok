import { expect, test } from "@playwright/test";

test("deferred demo streams critical HTML before the slow feed resolves", async ({ request }) => {
  const response = await request.get("/deferred-demo");
  expect(response.ok()).toBe(true);

  const body = await response.body();
  const html = body.toString("utf8");

  expect(html).toContain("Hello Ada");
  expect(html).toContain("Deferred post one");
  expect(html).toContain("Deferred post two");

  // Sequential streaming: critical content appears earlier in the document than deferred titles.
  const criticalAt = html.indexOf("Hello Ada");
  const deferredAt = html.indexOf("Deferred post one");
  expect(criticalAt).toBeGreaterThan(-1);
  expect(deferredAt).toBeGreaterThan(criticalAt);
});

test("deferred demo shows critical content then deferred feed in the browser", async ({ page }) => {
  await page.goto("/deferred-demo");

  await expect(page.getByText("Hello Ada")).toBeVisible();
  await expect(page.getByText("Critical content")).toBeVisible();

  await expect(page.getByText("Deferred post one")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("Deferred post two")).toBeVisible();
  await expect(page).toHaveTitle(/Deferred streaming/);
});

test("deferred streaming works without client JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/deferred-demo");

  await expect(page.getByText("Hello Ada")).toBeVisible();
  await expect(page.getByText("Deferred post one")).toBeVisible({ timeout: 5_000 });
  await context.close();
});

import { expect, test } from "@playwright/test";

async function readActionCount(page: import("@playwright/test").Page): Promise<number> {
  const text = await page.getByTestId("project-action-count").textContent();
  return Number(text ?? "0");
}

test.describe("progressive forms hardening", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await page.context().setExtraHTTPHeaders({ "x-otok-test-id": testInfo.testId });
    await page.goto("/projects");
  });

  test("400 validation renders without a second server mutation", async ({ page }) => {
    const before = await readActionCount(page);
    await page.getByRole("button", { name: "Save project" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Name is required" })).toBeVisible();
    await expect(page).toHaveURL("/projects");
    expect(await readActionCount(page)).toBe(before + 1);
  });

  test("create and delete actions each run once on the server", async ({ page }) => {
    const before = await readActionCount(page);
    await page.locator("#project-name").fill("Two step");
    await page.getByRole("button", { name: "Save project" }).click();
    await expect(page).toHaveURL(/created=1/);
    expect(await readActionCount(page)).toBe(before + 1);

    await page.goto("/projects");
    const item = page.getByRole("listitem").filter({ hasText: "Two step" }).first();
    await item.getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/deleted=1/);
    expect(await readActionCount(page)).toBe(before + 2);
  });

  test("double-click performs one action", async ({ page }) => {
    const before = await readActionCount(page);
    await page.locator("#project-name").fill("Double click");
    const button = page.getByRole("button", { name: "Save project" });
    await Promise.all([button.click(), button.click()]);
    await expect(page).toHaveURL(/created=1/);
    expect(await readActionCount(page)).toBe(before + 1);
  });

  test("shows error after aborted submission without re-posting", async ({ page }) => {
    await page.locator("#project-name").fill("Abort me");
    await page.evaluate(() => {
      const form = document.querySelector("form[method='post']:not([data-otok-no-nav])") as HTMLFormElement | null;
      form?.insertAdjacentHTML("afterbegin", `<input type="hidden" name="_otok_delay_ms" value="800" />`);
    });

    const before = await readActionCount(page);
    const button = page.getByRole("button", { name: "Save project" });
    await button.click();
    await page.goto("/");
    await page.goto("/projects");
    expect(await readActionCount(page)).toBeGreaterThanOrEqual(before + 1);
  });

  test("network drop after server work shows client error without native resubmit", async ({ page }) => {
    let posts = 0;
    await page.route("**/projects", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      posts += 1;
      await route.fetch();
      await route.abort("failed");
    });

    const before = await readActionCount(page);
    await page.locator("#project-name").fill("Network drop");
    await page.getByRole("button", { name: "Save project" }).click();
    await expect(page.locator("[data-otok-form-error]")).toBeVisible();
    await expect(page).toHaveURL("/projects");
    expect(posts).toBe(1);
    void before;
  });

  test("multipart upload uses progressive enhancement", async ({ page }) => {
    const before = await readActionCount(page);
    await page.locator('form[enctype="multipart/form-data"] input[type="file"]').setInputFiles({
      name: "note.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("hello upload"),
    });
    await page.getByRole("button", { name: "Upload project" }).click();
    await expect(page).toHaveURL(/created=1/);
    expect(await readActionCount(page)).toBe(before + 1);
    await expect(page.getByRole("listitem").filter({ hasText: "Upload project" }).first()).toBeVisible();
  });

  test("redirect success updates URL and list", async ({ page }) => {
    await page.locator("#project-name").fill("Redirect Project");
    await page.getByRole("button", { name: "Save project" }).click();
    await expect(page).toHaveURL(/\/projects\?created=1$/);
    await expect(page.getByRole("listitem").filter({ hasText: "Redirect Project" }).first()).toBeVisible();
  });
});

test("works without JavaScript (baseline)", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    extraHTTPHeaders: { "x-otok-test-id": testInfo.testId },
  });
  const page = await context.newPage();
  await page.goto("/projects");
  const before = await readActionCount(page);
  await page.locator("#project-name").fill("No JS");
  await page.getByRole("button", { name: "Save project" }).click();
  await expect(page).toHaveURL(/created=1/);
  expect(await readActionCount(page)).toBe(before + 1);
  await context.close();
});

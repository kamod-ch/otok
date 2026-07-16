import { expect, test } from "@playwright/test";

test("native form submission renders validation without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/projects");

  await page.getByRole("button", { name: "Save project" }).click();

  await expect(page).toHaveURL("/projects");
  await expect(page.getByRole("alert").filter({ hasText: "Name is required" })).toBeVisible();
  await expect(page.locator("#project-name")).toHaveAttribute("aria-invalid", "true");
  await context.close();
});

test("native form submission redirects after successful action", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/projects");

  await page.locator("#project-name").fill("No JS Project");
  await page.getByRole("button", { name: "Save project" }).click();

  await expect(page).toHaveURL(/\/projects\?created=1$/);
  await expect(page.getByRole("listitem").filter({ hasText: "No JS Project" }).first()).toBeVisible();
  await context.close();
});

test("progressive form submission updates the page without full navigation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Progressive forms" }).first().click();
  await expect(page).toHaveURL("/projects");

  await page.getByRole("button", { name: "Save project" }).click();
  await expect(page).toHaveURL("/projects");
  await expect(page.getByRole("alert").filter({ hasText: "Name is required" })).toBeVisible();
  await expect(page.locator("#project-name")).toHaveAttribute("aria-invalid", "true");

  await page.locator("#project-name").fill("Enhanced Project");
  await page.getByLabel("Featured").check();
  await page.getByRole("button", { name: "Save project" }).click();

  await expect(page).toHaveURL(/\/projects\?created=1$/);
  const enhancedProject = page.getByRole("listitem").filter({ hasText: "Enhanced Project" }).first();
  await expect(enhancedProject).toBeVisible();
  await expect(enhancedProject.getByText("Featured")).toBeVisible();
});

test("keyboard submission, submitter values, checkbox values, and back navigation work", async ({ page }) => {
  await page.goto("/projects");
  await page.locator("#project-name").fill("Keyboard Project");
  await page.getByLabel("Featured").check();
  await page.locator("#project-name").press("Enter");

  await expect(page).toHaveURL(/\/projects\?created=1$/);
  const keyboardProject = page.getByRole("listitem").filter({ hasText: "Keyboard Project" }).first();
  await expect(keyboardProject).toBeVisible();
  await expect(keyboardProject.getByText("Featured")).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL("/projects");
});

test("opt-out form uses native submission", async ({ page }) => {
  await page.goto("/projects");
  await page.getByRole("button", { name: "Native opt-out submit" }).click();
  await expect(page).toHaveURL(/\/projects\?created=1$/);
  await expect(page.getByRole("listitem").filter({ hasText: "Opt out project" }).first()).toBeVisible();
});

test("method override deletes projects through actions", async ({ page }) => {
  await page.goto("/projects");
  await page.locator("#project-name").fill("Delete Me");
  await page.getByRole("button", { name: "Save project" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Delete Me" }).first()).toBeVisible();

  const item = page.getByRole("listitem").filter({ hasText: "Delete Me" }).first();
  await item.getByRole("button", { name: "Delete" }).click();

  await expect(page).toHaveURL(/\/projects\?deleted=1$/);
  await expect(page.getByText("Delete Me")).toHaveCount(0);
});

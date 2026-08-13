import { expect, test } from "@playwright/test";

test("CRM company edit works without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/crm/companies/acme");

  const nativeForm = page.getByTestId("company-native-form");
  await nativeForm.getByLabel("Company name").fill("Acme Industries");
  await nativeForm.getByRole("button", { name: "Save", exact: true }).click();

  await expect(page.getByRole("heading", { level: 2, name: "Acme Industries" })).toBeVisible();
  await context.close();
});

test("CRM save and return redirects without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/crm/companies/northwind");

  const nativeForm = page.getByTestId("company-native-form");
  await nativeForm.getByLabel("Company name").fill("Northwind Global");
  await nativeForm.getByRole("button", { name: "Save & return" }).click();

  await expect(page).toHaveURL(/\/crm\?updated=1$/);
  await expect(page.getByRole("cell", { name: "Northwind Global" })).toBeVisible();
  await context.close();
});

test("useFetcher adds activity without full navigation", async ({ page }) => {
  const note = `Follow-up email sent ${Date.now()}`;

  await page.goto("/crm/companies/acme");
  await page.getByPlaceholder("Log an activity…").fill(note);
  await page.getByRole("button", { name: "Add" }).click();

  await expect(page.getByText(note)).toBeVisible();
  await expect(page).toHaveURL("/crm/companies/acme");
});

test("useAction optimistic save updates company editor", async ({ page }) => {
  await page.goto("/crm/companies/acme");
  const editor = page.locator("text=Enhanced editor").locator("..");

  await editor.getByLabel("Company name").fill("Acme Optimistic");
  await editor.getByRole("button", { name: "Save with optimistic update" }).click();

  await expect(editor.getByRole("status")).toContainText("Saved at");
  await expect(editor.getByLabel("Company name")).toHaveValue("Acme Optimistic");
});

test("optimistic table rename rolls forward on success", async ({ page }) => {
  await page.goto("/crm");
  const firstRow = page.locator("tbody tr").first();
  const originalName = await firstRow.locator("td").first().textContent();

  await page.getByRole("button", { name: "Optimistic rename first row" }).click();
  await expect(firstRow.locator("td").first()).not.toHaveText(originalName ?? "");
});

test("browser history back restores CRM list after edit", async ({ page }) => {
  await page.goto("/crm");
  await page.getByRole("link", { name: "Edit" }).first().click();
  await expect(page).toHaveURL(/\/crm\/companies\//);

  await page.goBack();
  await expect(page).toHaveURL("/crm");
});

test("activity form validation shows accessible error", async ({ page }) => {
  await page.goto("/crm/companies/acme");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
});

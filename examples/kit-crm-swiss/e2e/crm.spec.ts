import { test, expect } from "@playwright/test";

test.describe("Swiss CRM reference", () => {
  test("login, search company, import zefix sample", async ({ page }) => {
    await page.goto("/login");
    await page.selectOption('select[name="userId"]', "user-admin");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/crm/);

    await page.fill('input[name="q"]', "Eirao");
    await page.getByRole("button", { name: "Filtern" }).click();
    await expect(page.getByText("Eirao Reinigung GmbH")).toBeVisible();

    await page.goto("/crm/import");
    await page.getByRole("button", { name: /Beispieldaten importieren/ }).click();
    await expect(page.getByText(/Importiert:/)).toBeVisible();
  });

  test("company detail — activity and pipeline", async ({ page }) => {
    await page.goto("/login");
    await page.selectOption('select[name="userId"]', "user-sales");
    await page.getByRole("button", { name: "Anmelden" }).click();

    await page.getByRole("link", { name: "Migros" }).first().click();
    await page.fill('input[name="subject"]', "E2E Test Aktivität");
    await page.getByRole("button", { name: "Speichern" }).first().click();
    await expect(page.getByText("E2E Test Aktivität")).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";

test("soft navigation updates title, head metadata, swap regions, and history", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Dashboard | Otok Playground");
  const initialHistoryLength = await page.evaluate(() => history.length);

  await page.getByRole("link", { name: "Progressive forms" }).first().click();
  await expect(page).toHaveURL("/projects");
  await expect(page).toHaveTitle("Projects | Otok Playground");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Progressive forms powered by Otok route actions.",
  );
  await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();

  await expect(await page.evaluate(() => history.length)).toBeGreaterThanOrEqual(initialHistoryLength);

  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
});

test("soft navigation prefetches links on hover", async ({ page }) => {
  await page.goto("/");
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/demo") && response.ok());
  await page.getByRole("link", { name: "kamod-ui islands" }).first().hover();
  await responsePromise;
});

test("hash, api, download, external, and no-page-region links use browser defaults", async ({ page }) => {
  const addLinks = async () => {
    await page.evaluate(() => {
      const hash = document.createElement("a");
      hash.href = "#project-name";
      hash.textContent = "Hash target";
      document.body.append(hash);

      const api = document.createElement("a");
      api.href = "/api/health";
      api.textContent = "API health";
      document.body.append(api);

      const download = document.createElement("a");
      download.href = "/about";
      download.download = "about.html";
      download.textContent = "Download about";
      document.body.append(download);

      const external = document.createElement("a");
      external.href = "https://example.com/";
      external.target = "_self";
      external.textContent = "External example";
      document.body.append(external);

      const plain = document.createElement("a");
      plain.href = "/plain-html";
      plain.textContent = "Plain HTML";
      document.body.append(plain);
    });
  };

  await page.goto("/projects");
  await addLinks();

  await page.getByRole("link", { name: "Hash target" }).click();
  await expect(page).toHaveURL(/\/projects#project-name$/);

  await page.goto("/projects");
  await addLinks();
  await page.getByRole("link", { name: "API health" }).click();
  await expect(page).toHaveURL("/api/health");
  await expect(page.locator("body")).toContainText("framework");

  await page.goto("/projects");
  await addLinks();
  await page.getByRole("link", { name: "Plain HTML" }).click();
  await expect(page).toHaveURL("/plain-html");
  await expect(page.locator("body")).toContainText("No Otok page region");

  await page.goto("/projects");
  await addLinks();
  await expect(page.getByRole("link", { name: "Download about" })).toHaveAttribute("download", "about.html");
  await expect(page.getByRole("link", { name: "External example" })).toHaveAttribute("href", "https://example.com/");
});

test("soft navigation falls back to full document for server errors", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const boom = document.createElement("a");
    boom.href = "/boom";
    boom.textContent = "Boom";
    document.body.append(boom);
  });
  await page.getByRole("link", { name: "Boom" }).click();
  await expect(page).toHaveURL("/boom");
  await expect(page.getByText("Boom from loader")).toBeVisible();
});

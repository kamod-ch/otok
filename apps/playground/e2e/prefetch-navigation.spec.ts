import { expect, test } from "@playwright/test";

test.describe("prefetch and navigation freshness", () => {
  test("redirect navigation uses final URL in history", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      const link = document.createElement("a");
      link.href = "/prefetch-redirect";
      link.textContent = "Prefetch redirect";
      document.body.append(link);
    });
    await page.getByRole("link", { name: "Prefetch redirect" }).click();
    await expect(page).toHaveURL("/about");
    await expect(page.getByText("This route has no islands.")).toBeVisible();
    await expect.poll(async () => page.evaluate(() => history.state?.url ?? "")).toMatch(/^\/about$/);
  });

  test("no-store prefetch is not reused on navigation", async ({ page }) => {
    let fetches = 0;
    await page.route("**/prefetch-test/no-store", async (route) => {
      fetches += 1;
      await route.continue();
    });

    await page.goto("/");
    await page.evaluate(() => {
      const link = document.createElement("a");
      link.href = "/prefetch-test/no-store";
      link.textContent = "No store prefetch";
      document.body.append(link);
    });

    await page.getByRole("link", { name: "No store prefetch" }).hover();
    await page.waitForTimeout(300);
    const afterHover = fetches;

    await page.getByRole("link", { name: "No store prefetch" }).click();
    await expect(page.getByTestId("prefetch-no-store")).toBeVisible();
    expect(fetches).toBeGreaterThan(afterHover);
  });

  test("browser back/forward keeps soft-nav history entries", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Progressive forms" }).first().click();
    await expect(page).toHaveURL("/projects");
    await page.goBack();
    await expect(page).toHaveURL("/");
    await page.goForward();
    await expect(page).toHaveURL("/projects");
  });

  test("in-page hash target scrolls after soft navigation", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      const link = document.createElement("a");
      link.href = "/projects#project-name";
      link.textContent = "Projects hash";
      document.body.append(link);
    });
    await page.getByRole("link", { name: "Projects hash" }).click();
    await expect(page).toHaveURL(/\/projects#project-name$/);
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const el = document.getElementById("project-name");
          if (!el) return 9999;
          const rect = el.getBoundingClientRect();
          return Math.abs(rect.top) + Math.abs(rect.bottom - rect.top);
        }),
      )
      .toBeLessThan(400);
  });
});

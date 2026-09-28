import { test, expect } from "@playwright/test";
import pg from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://otok:otok@localhost:5437/discussions_reference";

async function withDb<T>(fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("reference");
  await page.getByRole("button", { name: /Login|Sign in/i }).click();
  await page.waitForURL(/\/articles/, { timeout: 15_000 });
}

test.describe("discussions reference e2e", () => {
  test("guest sees preview and login gate on compose", async ({ page }) => {
    await page.goto("/discussions/open-debate/thread");
    await page.getByRole("link", { name: /Anmelden|Sign in|Login|Zum Login/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("authenticated user posts comment without javascript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/login");
    await page.locator('input[name="email"]').fill("reader.a@ref.local");
    await page.locator('input[name="password"]').fill("reference");
    await page.getByRole("button", { name: /Login|Sign in/i }).click();
    await page.waitForURL(/\/articles/);

    const threadId = await withDb(async (c) => {
      const r = await c.query(`select id from discussions_threads where subject_id = $1 limit 1`, ["open-debate"]);
      return r.rows[0]?.id as string;
    });
    const before = await withDb(async (c) => {
      const r = await c.query(`select count(*)::int as c from discussions_comments where thread_id = $1`, [threadId]);
      return r.rows[0].c as number;
    });

    await page.goto("/discussions/open-debate/thread");
    await page.locator('textarea[name="bodyMarkdown"]').fill("E2E ohne JavaScript");
    await page.getByRole("button", { name: /Senden|Post|Submit|Kommentar/i }).click();
    await page.waitForURL(/\/discussions\/open-debate\/thread/);

    const after = await withDb(async (c) => {
      const r = await c.query(`select count(*)::int as c from discussions_comments where thread_id = $1`, [threadId]);
      return r.rows[0].c as number;
    });
    expect(after).toBe(before + 1);
    await context.close();
  });

  test("422 validation does not duplicate comments", async ({ page }) => {
    await login(page, "reader.a@ref.local");
    const threadId = await withDb(async (c) => {
      const r = await c.query(`select id from discussions_threads where subject_id = 'open-debate' limit 1`);
      return r.rows[0].id as string;
    });
    const before = await withDb(async (c) => {
      const r = await c.query(`select count(*)::int as c from discussions_comments where thread_id = $1`, [threadId]);
      return r.rows[0].c as number;
    });

    await page.goto("/discussions/open-debate/thread");
    await page.locator('textarea[name="bodyMarkdown"]').fill("");
    const submit = page.locator('form[method="post"]').first().getByRole("button", { name: /Senden|Post|Submit/i });
    await submit.click();
    await expect(page.locator("body")).toContainText(/(leer|empty|required|Pflicht)/i);
    await submit.click();

    const after = await withDb(async (c) => {
      const r = await c.query(`select count(*)::int as c from discussions_comments where thread_id = $1`, [threadId]);
      return r.rows[0].c as number;
    });
    expect(after).toBe(before);
  });

  test("moderated article pending vs trusted publish", async ({ page }) => {
    await login(page, "trusted.a@ref.local");
    await page.goto("/discussions/moderated-piece/thread");
    await page.locator('textarea[name="bodyMarkdown"]').fill("Trusted sofort live");
    await page.getByRole("button", { name: /Senden|Post|Submit/i }).click();
    await expect(page.getByText("Trusted sofort live")).toBeVisible();

    await page.goto("/auth/logout");
    await page.locator('form[method="post"]').first().evaluate((f: HTMLFormElement) => f.submit());
    await login(page, "reader.a@ref.local");
    await page.goto("/discussions/moderated-piece/thread");
    await page.locator('textarea[name="bodyMarkdown"]').fill("Pending Leser Kommentar");
    await page.getByRole("button", { name: /Senden|Post|Submit/i }).click();
    await expect(page.getByText("Pending Leser Kommentar")).not.toBeVisible();

    const pending = await withDb(async (c) => {
      const r = await c.query(
        `select count(*)::int as c from discussions_comments where body_markdown = $1 and status = 'pending'`,
        ["Pending Leser Kommentar"],
      );
      return r.rows[0].c as number;
    });
    expect(pending).toBe(1);
  });

  test("tenant B moderator queue excludes tenant A pending", async ({ page }) => {
    await login(page, "mod.b@ref.local");
    await page.goto("/discussions/moderation/queue");
    await expect(page.getByText("Ausstehend: neue Leserstimme")).not.toBeVisible();
  });

  test("mobile viewport smoke", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/articles");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
  });
});

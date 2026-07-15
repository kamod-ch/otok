import { expect, test } from "@playwright/test";

test("production build serves health, assets, cache headers, and 404", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBe(true);
  expect(health.headers()["content-type"]).toMatch(/application\/json/);
  expect(await health.json()).toMatchObject({ ok: true, framework: "otok" });

  const htmlResponse = await request.get("/");
  expect(htmlResponse.ok()).toBe(true);
  const html = await htmlResponse.text();
  const asset = /<link rel="stylesheet" href="([^"]+)">/.exec(html)?.[1];
  expect(asset).toBeTruthy();

  const assetResponse = await request.get(asset!);
  expect(assetResponse.ok()).toBe(true);
  expect(assetResponse.headers()["cache-control"]).toMatch(/max-age=31536000/);

  const missing = await request.get("/missing-production-test-route");
  expect(missing.status()).toBe(404);
});

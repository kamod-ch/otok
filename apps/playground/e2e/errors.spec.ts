import { expect, test } from "@playwright/test";

test("expected failures render the error route with the intended status", async ({ request }) => {
  const response = await request.get("/boom");
  expect(response.status()).toBe(500);
  expect(await response.text()).toContain("Boom from loader");
});

test("unexpected exceptions hide internal details by default", async ({ request }) => {
  const response = await request.get("/crash");
  expect(response.status()).toBe(500);
  const html = await response.text();
  expect(html).toContain("Internal server error");
  expect(html).not.toContain("Secret stack detail");
});

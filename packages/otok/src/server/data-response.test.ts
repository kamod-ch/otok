import { describe, expect, it } from "vitest";
import { buildDataResponse, dataResponseFromActionResult, dataResponseFromError } from "./data-response.js";

describe("data-response", () => {
  it("serializes action and loader data", async () => {
    const response = dataResponseFromActionResult({ ok: true }, { items: [1] });
    expect(response.headers.get("content-type")).toContain("application/vnd.otok+json");

    const payload = await response.json();
    expect(payload.actionData).toEqual({ ok: true });
    expect(payload.loaderData).toEqual({ items: [1] });
  });

  it("serializes validation errors", async () => {
    const response = dataResponseFromError({
      status: 400,
      message: "Validation failed",
      fieldErrors: { name: ["Required"] },
    });
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error?.fieldErrors?.name).toEqual(["Required"]);
  });

  it("builds redirect payloads for fetcher navigation", async () => {
    const response = buildDataResponse({ redirect: "/crm?updated=1" });
    const payload = await response.json();
    expect(payload.redirect).toBe("/crm?updated=1");
  });
});

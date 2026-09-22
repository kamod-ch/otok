// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { OTOK_PAGE_ATTR } from "../shared/navigation.js";
import {
  analyzeSoftNavFormSupport,
  buildSoftFormFetchInit,
  isValidationHtmlResponse,
  nativeRequestSubmit,
} from "./soft-nav-form.js";
import { submitSoftNavigationFormResult } from "./soft-nav.js";

describe("analyzeSoftNavFormSupport", () => {
  it("rejects unsupported enctype before interception", () => {
    const form = document.createElement("form");
    form.action = "http://localhost/projects";
    form.method = "post";
    form.enctype = "text/plain";
    const result = analyzeSoftNavFormSupport(form, undefined, new URL("http://localhost/") as unknown as Location);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("unsupported-enctype");
  });

  it("includes submitter name in urlencoded POST body", () => {
    const form = document.createElement("form");
    form.action = "http://localhost/projects";
    form.method = "post";
    const button = document.createElement("button");
    button.name = "intent";
    button.value = "create";
    button.type = "submit";
    form.append(button);
    document.body.append(form);

    const analysis = analyzeSoftNavFormSupport(form, button, new URL("http://localhost/") as unknown as Location);
    expect(analysis.ok).toBe(true);
    if (!analysis.ok) return;

    const { init } = buildSoftFormFetchInit(form, button, analysis, new AbortController().signal);
    expect(init.body).toBeInstanceOf(URLSearchParams);
    expect((init.body as URLSearchParams).get("intent")).toBe("create");
    form.remove();
  });
});

describe("isValidationHtmlResponse", () => {
  it("accepts html 400/422", () => {
    expect(isValidationHtmlResponse(new Response("", { status: 400, headers: { "content-type": "text/html" } }))).toBe(
      true,
    );
    expect(isValidationHtmlResponse(new Response("", { status: 422, headers: { "content-type": "text/html" } }))).toBe(
      true,
    );
    expect(isValidationHtmlResponse(new Response("", { status: 500, headers: { "content-type": "text/html" } }))).toBe(
      false,
    );
  });
});

describe("submitSoftNavigationFormResult", () => {
  it("applies validation HTML without native resubmit", async () => {
    document.body.innerHTML = `<div ${OTOK_PAGE_ATTR}><p>Before</p></div>`;
    const form = document.createElement("form");
    form.action = `${window.location.origin}/projects`;
    form.method = "post";
    form.noValidate = true;
    document.body.append(form);

    const html = `<!doctype html><html><body><div ${OTOK_PAGE_ATTR}><p role="alert">Name is required</p></div></body></html>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(html, { status: 400, headers: { "content-type": "text/html" } })),
    );

    const submitSpy = vi.spyOn(form, "requestSubmit");
    const result = await submitSoftNavigationFormResult(form, undefined, {});
    expect(result.kind).toBe("validation");
    expect(document.querySelector(`[${OTOK_PAGE_ATTR}]`)?.textContent).toContain("Name is required");
    expect(submitSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    submitSpy.mockRestore();
  });

  it("does not call native submit after network failure", async () => {
    document.body.innerHTML = `<div ${OTOK_PAGE_ATTR}><p>Before</p></div>`;
    const form = document.createElement("form");
    form.action = `${window.location.origin}/projects`;
    form.method = "post";
    form.noValidate = true;
    document.body.append(form);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))),
    );
    const submitSpy = vi.spyOn(form, "requestSubmit");

    const result = await submitSoftNavigationFormResult(form, undefined, {});
    expect(result.kind).toBe("error");
    expect(submitSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    submitSpy.mockRestore();
  });
});

describe("nativeRequestSubmit", () => {
  it("preserves submitter via requestSubmit", () => {
    const form = document.createElement("form");
    const button = document.createElement("button");
    button.name = "intent";
    button.value = "draft";
    form.append(button);
    const spy = vi.spyOn(form, "requestSubmit");
    nativeRequestSubmit(form, button);
    expect(spy).toHaveBeenCalledWith(button);
    spy.mockRestore();
  });
});

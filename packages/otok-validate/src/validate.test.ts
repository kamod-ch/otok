import { describe, expect, it } from "vitest";
import { z } from "zod";
import { isOtokHttpError } from "otok/server";
import { formDataToRecord } from "./form-data-to-record.js";
import { parseFormData } from "./form-data.js";
import { parseJson, parseJsonValue } from "./json.js";
import { issuesToFieldErrors, zodErrorToValidationInput } from "./zod-errors.js";
import { toJsonValues } from "./values.js";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

describe("formDataToRecord", () => {
  it("converts flat fields to strings", () => {
    const formData = new FormData();
    formData.set("email", "a@example.com");
    formData.set("password", "secret123");

    expect(formDataToRecord(formData)).toEqual({
      email: "a@example.com",
      password: "secret123",
    });
  });

  it("collects repeated keys into arrays when configured", () => {
    const formData = new FormData();
    formData.append("tags", "a");
    formData.append("tags", "b");

    expect(formDataToRecord(formData, { arrays: ["tags"] })).toEqual({
      tags: ["a", "b"],
    });
  });

  it("normalizes checkbox fields", () => {
    const checked = new FormData();
    checked.set("remember", "on");

    const unchecked = new FormData();

    expect(formDataToRecord(checked, { checkboxes: ["remember"] })).toEqual({
      remember: true,
    });
    expect(formDataToRecord(unchecked, { checkboxes: ["remember"] })).toEqual({
      remember: false,
    });
  });
});

describe("parseFormData", () => {
  it("returns parsed data for valid submissions", () => {
    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "password123");

    expect(parseFormData(formData, loginSchema)).toEqual({
      email: "user@example.com",
      password: "password123",
    });
  });

  it("throws validationError with field errors and values", () => {
    const formData = new FormData();
    formData.set("email", "not-an-email");
    formData.set("password", "short");

    try {
      parseFormData(formData, loginSchema);
      throw new Error("expected validationError");
    } catch (error) {
      expect(isOtokHttpError(error)).toBe(true);
      if (!isOtokHttpError(error)) return;
      expect(error.status).toBe(400);
      expect(error.failure?.fieldErrors?.email).toBeDefined();
      expect(error.failure?.fieldErrors?.password).toBeDefined();
      expect(error.failure?.values).toEqual({
        email: "not-an-email",
        password: "short",
      });
    }
  });

  it("supports custom status codes", () => {
    const formData = new FormData();
    formData.set("email", "");
    formData.set("password", "");

    try {
      parseFormData(formData, loginSchema, { status: 422 });
      throw new Error("expected validationError");
    } catch (error) {
      expect(isOtokHttpError(error)).toBe(true);
      if (!isOtokHttpError(error)) return;
      expect(error.status).toBe(422);
    }
  });
});

describe("parseJson", () => {
  it("parses valid JSON bodies", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "password123" }),
    });

    await expect(parseJson(request, loginSchema)).resolves.toEqual({
      email: "user@example.com",
      password: "password123",
    });
  });

  it("throws validationError for invalid JSON", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      body: "{",
    });

    await expect(parseJson(request, loginSchema)).rejects.toSatisfy((error: unknown) => {
      return isOtokHttpError(error) && error.status === 400;
    });
  });
});

describe("parseJsonValue", () => {
  it("validates already parsed values", () => {
    expect(
      parseJsonValue({ email: "user@example.com", password: "password123" }, loginSchema),
    ).toEqual({
      email: "user@example.com",
      password: "password123",
    });
  });
});

describe("zod error helpers", () => {
  it("maps zod issues to field and form errors", () => {
    const result = loginSchema.safeParse({ email: "", password: "" });
    if (result.success) throw new Error("expected failure");

    const mapped = zodErrorToValidationInput(result.error, { email: "", password: "" });
    expect(mapped.fieldErrors).toBeDefined();
    expect(mapped.values).toEqual({ email: "", password: "" });
  });

  it("maps root issues to formErrors", () => {
    const schema = z.string().min(3);
    const result = schema.safeParse("a");
    if (result.success) throw new Error("expected failure");

    expect(issuesToFieldErrors(result.error.issues).formErrors?.length).toBeGreaterThan(0);
  });
});

describe("toJsonValues", () => {
  it("keeps serializable form values", () => {
    expect(
      toJsonValues({
        email: "a@example.com",
        count: 2,
        active: true,
        tags: ["a", "b"],
      }),
    ).toEqual({
      email: "a@example.com",
      count: 2,
      active: true,
      tags: ["a", "b"],
    });
  });
});

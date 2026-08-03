import { describe, expect, it } from "vitest";
import { z } from "zod";
import * as v from "valibot";
import { type } from "arktype";
import { fromArkType } from "./adapters/arktype.js";
import { isOtokHttpError } from "otok/server";
import { parseFormData } from "./parse/form-data.js";
import { parseJson, parseJsonValue } from "./parse/json.js";
import { parseParams } from "./parse/params.js";
import { defineAction } from "./loader.js";
import { safeValidate } from "./client.js";
import { validateSchema, issuesToValidationInput } from "./standard.js";
import { formDataToRecord } from "./parse/form-data-to-record.js";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email"),
});

const valibotContactSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1, "Name is required")),
  email: v.pipe(v.string(), v.trim(), v.email("Invalid email")),
});

const arkContactType = fromArkType(type({
  name: "string >= 1",
  email: "string.email",
}));

describe("formDataToRecord", () => {
  it("converts flat fields", () => {
    const formData = new FormData();
    formData.set("name", "Ada");
    formData.set("email", "ada@example.com");
    expect(formDataToRecord(formData)).toEqual({ name: "Ada", email: "ada@example.com" });
  });
});

describe("parseFormData with Zod", () => {
  it("returns parsed data", async () => {
    const formData = new FormData();
    formData.set("name", "Ada");
    formData.set("email", "ada@example.com");
    await expect(parseFormData(formData, contactSchema)).resolves.toEqual({
      name: "Ada",
      email: "ada@example.com",
    });
  });

  it("throws validationError with field errors", async () => {
    const formData = new FormData();
    formData.set("name", "");
    formData.set("email", "bad");

    await expect(parseFormData(formData, contactSchema)).rejects.toSatisfy((error: unknown) => {
      return isOtokHttpError(error) && error.status === 400;
    });
  });
});

describe("parseJson", () => {
  it("parses JSON bodies", async () => {
    const request = new Request("http://localhost/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ada", email: "ada@example.com" }),
    });
    await expect(parseJson(request, contactSchema)).resolves.toEqual({
      name: "Ada",
      email: "ada@example.com",
    });
  });
});

describe("parseParams", () => {
  it("validates route params", async () => {
    const paramsSchema = z.object({ id: z.coerce.number() });
    await expect(parseParams({ id: "42" }, paramsSchema)).resolves.toEqual({ id: 42 });
  });
});

describe("Standard Schema adapters", () => {
  it("validates Valibot schemas", async () => {
    const result = await validateSchema(valibotContactSchema as never, {
      name: "Ada",
      email: "ada@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Ada", email: "ada@example.com" });
    }
  });

  it("validates ArkType schemas", async () => {
    const result = await validateSchema(arkContactType, {
      name: "Ada",
      email: "ada@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("maps issues to field errors", () => {
    const result = contactSchema.safeParse({ name: "", email: "bad" });
    if (result.success) throw new Error("expected failure");
    const mapped = issuesToValidationInput(
      result.error.issues.map((issue) => ({
        message: issue.message,
        path: issue.path,
      })),
    );
    expect(mapped.fieldErrors).toBeDefined();
  });
});

describe("defineAction", () => {
  it("parses form input and passes to handler", async () => {
    const action = defineAction({
      schema: contactSchema,
      handler: async ({ input }) => ({ ok: true, contact: input }),
    });

    const formData = new FormData();
    formData.set("name", "Ada");
    formData.set("email", "ada@example.com");

    const result = await action({
      hono: { get: () => undefined } as never,
      request: new Request("http://localhost/", { method: "POST" }),
      params: {},
      route: "/",
      method: "POST",
      formData,
    });

    expect(result).toEqual({
      ok: true,
      contact: { name: "Ada", email: "ada@example.com" },
    });
  });

  it("parses JSON input when content-type is application/json", async () => {
    const action = defineAction({
      schema: contactSchema,
      handler: async ({ input }) => input,
    });

    const result = await action({
      hono: { get: () => undefined } as never,
      request: new Request("http://localhost/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Ada", email: "ada@example.com" }),
      }),
      params: {},
      route: "/",
      method: "POST",
    });

    expect(result).toEqual({ name: "Ada", email: "ada@example.com" });
  });
});

describe("safeValidate (client contract)", () => {
  it("returns success without throwing", async () => {
    const result = await safeValidate(contactSchema, {
      name: "Ada",
      email: "ada@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("returns field errors on failure", async () => {
    const result = await safeValidate(contactSchema, { name: "", email: "bad" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors).toBeDefined();
    }
  });
});

describe("parseJsonValue", () => {
  it("validates plain values", async () => {
    await expect(
      parseJsonValue({ name: "Ada", email: "ada@example.com" }, contactSchema),
    ).resolves.toEqual({ name: "Ada", email: "ada@example.com" });
  });
});

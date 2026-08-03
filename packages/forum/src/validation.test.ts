import { describe, expect, it } from "vitest";
import { createPostSchema, createThreadSchema, titleSchema, validationErrorFromZod } from "./validation.js";

describe("forum validation", () => {
  it("validates thread title length", () => {
    expect(titleSchema.safeParse("ab").success).toBe(false);
    expect(titleSchema.safeParse("Valid Title").success).toBe(true);
  });

  it("validates create thread schema", () => {
    const result = createThreadSchema.safeParse({
      categoryId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Hello",
      content: "World",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty post content", () => {
    const result = createPostSchema.safeParse({
      threadId: "550e8400-e29b-41d4-a716-446655440000",
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("maps zod errors to field errors", () => {
    const result = createThreadSchema.safeParse({ categoryId: "bad", title: "x", content: "" });
    if (result.success) throw new Error("expected failure");
    const mapped = validationErrorFromZod(result.error);
    expect(Object.keys(mapped.fieldErrors).length).toBeGreaterThan(0);
  });
});

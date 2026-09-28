import { describe, expect, it } from "vitest";
import {
  assertCommentTransition,
  assertThreadTransition,
  canCommentTransition,
  canThreadTransition,
} from "./transitions.js";
import { DiscussionError } from "../types/errors.js";

describe("thread transitions", () => {
  it("allows valid paths", () => {
    expect(canThreadTransition("scheduled", "open")).toBe(true);
    expect(canThreadTransition("open", "read_only")).toBe(true);
    expect(canThreadTransition("closed", "archived")).toBe(true);
  });

  it("rejects invalid paths with INVALID_TRANSITION", () => {
    expect(() => assertThreadTransition("archived", "open")).toThrow(DiscussionError);
    try {
      assertThreadTransition("scheduled", "closed");
    } catch (e) {
      expect(e).toMatchObject({ code: "INVALID_TRANSITION" });
    }
  });
});

describe("comment transitions", () => {
  it("allows moderation flow", () => {
    expect(canCommentTransition("pending", "published")).toBe(true);
    expect(canCommentTransition("published", "hidden")).toBe(true);
  });

  it("rejects deleted -> published", () => {
    expect(() => assertCommentTransition("deleted", "published")).toThrow(DiscussionError);
  });
});

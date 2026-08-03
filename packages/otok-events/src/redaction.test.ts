import { describe, expect, it } from "vitest";
import { redactEvent, redactPayload } from "./redaction.js";
import { defineEvent } from "./define-event.js";

describe("redaction", () => {
  it("redacts configured fields", () => {
    const payload = { email: "a@b.com", token: "secret", nested: { password: "x" } };
    const redacted = redactPayload(payload, ["token", "password"]);
    expect(redacted).toEqual({
      email: "a@b.com",
      token: "[REDACTED]",
      nested: { password: "[REDACTED]" },
    });
  });

  it("redacts event payloads for logging", () => {
    const def = defineEvent({
      name: "auth.login",
      version: 1,
      redactFields: ["password"],
    });
    const event = {
      id: "1",
      name: "auth.login",
      version: 1,
      payload: { user: "a", password: "secret" },
      metadata: { correlationId: "c1" },
      occurredAt: "2026-01-01T00:00:00Z",
    };
    expect(redactEvent(event, def).payload).toEqual({ user: "a", password: "[REDACTED]" });
  });
});

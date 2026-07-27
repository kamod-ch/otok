import { describe, expect, it, beforeEach } from "vitest";
import { createMailClient } from "./client.js";
import { OtokMailSendError } from "./errors.js";
import { createTestMailProvider, resetTestMailProvider } from "./providers/test.js";

describe("MailClient retry", () => {
  beforeEach(() => {
    resetTestMailProvider();
  });

  it("retries retryable send errors", async () => {
    let attempts = 0;
    const provider = {
      name: "flaky",
      capabilities: { delivery: true, html: true, preview: false },
      async send() {
        attempts += 1;
        if (attempts < 3) {
          throw new OtokMailSendError("temporary", true);
        }
        return createTestMailProvider().send({
          from: "app@example.com",
          to: "user@example.com",
          subject: "Hi",
          text: "Hello",
        });
      },
    };

    const client = createMailClient(provider, "app@example.com", {
      maxAttempts: 3,
      initialBackoffMs: 1,
      maxBackoffMs: 1,
    });

    const result = await client.send({
      to: "user@example.com",
      subject: "Hi",
      text: "Hello",
    });

    expect(attempts).toBe(3);
    expect(result.provider).toBe("test");
  });
});

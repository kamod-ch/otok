import { describe, expect, it } from "vitest";
import { seal, sealOAuthState, unseal, unsealOAuthState } from "./state.js";

const secret = "test-oauth-secret-at-least-32-chars!!";

describe("seal/unseal", () => {
  it("round-trips payloads", () => {
    const token = seal('{"ok":true}', secret);
    expect(unseal(token, secret)).toBe('{"ok":true}');
  });

  it("rejects tampered tokens", () => {
    const token = seal("hello", secret);
    expect(unseal(`${token}x`, secret)).toBeNull();
    expect(unseal("not-a-token", secret)).toBeNull();
  });
});

describe("oauth state", () => {
  it("seals and unseals oauth payloads", () => {
    const payload = {
      provider: "github" as const,
      state: "abc",
      codeVerifier: null,
      next: "/studio",
      issuedAt: Date.now(),
    };
    const token = sealOAuthState(payload, secret);
    expect(unsealOAuthState(token, secret)).toEqual(payload);
  });

  it("rejects expired payloads", () => {
    const token = sealOAuthState(
      {
        provider: "google",
        state: "xyz",
        codeVerifier: "verifier",
        next: null,
        issuedAt: Date.now() - 11 * 60 * 1000,
      },
      secret,
    );
    expect(unsealOAuthState(token, secret)).toBeNull();
  });

  it("rejects invalid json payloads", () => {
    const token = seal("not-json", secret);
    expect(unsealOAuthState(token, secret)).toBeNull();
  });
});

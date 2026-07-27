import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchGitHubProfile } from "./profile/github.js";
import { fetchGoogleProfile } from "./profile/google.js";
import { OAuthFlowError } from "./errors.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchGitHubProfile", () => {
  it("normalizes user and primary verified email", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/user")) {
          return {
            ok: true,
            json: async () => ({
              id: 42,
              login: "octocat",
              name: "The Octocat",
              email: null,
              avatar_url: "https://avatars.example/octocat",
            }),
          };
        }
        return {
          ok: true,
          json: async () => [
            { email: "hidden@users.noreply.github.com", primary: false, verified: true },
            { email: "octocat@example.com", primary: true, verified: true },
          ],
        };
      }),
    );

    await expect(fetchGitHubProfile("token")).resolves.toEqual({
      provider: "github",
      providerAccountId: "42",
      email: "octocat@example.com",
      emailVerified: true,
      name: "The Octocat",
      avatarUrl: "https://avatars.example/octocat",
    });
  });

  it("throws profile_error when /user fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 401,
        json: async () => ({}),
      })),
    );

    await expect(fetchGitHubProfile("bad")).rejects.toBeInstanceOf(OAuthFlowError);
  });
});

describe("fetchGoogleProfile", () => {
  it("normalizes openid userinfo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          sub: "google-sub-1",
          email: "user@gmail.com",
          email_verified: true,
          name: "User",
          picture: "https://lh3.example/photo",
        }),
      })),
    );

    await expect(fetchGoogleProfile("token")).resolves.toEqual({
      provider: "google",
      providerAccountId: "google-sub-1",
      email: "user@gmail.com",
      emailVerified: true,
      name: "User",
      avatarUrl: "https://lh3.example/photo",
    });
  });

  it("throws when sub is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ email: "user@gmail.com" }),
      })),
    );

    await expect(fetchGoogleProfile("token")).rejects.toBeInstanceOf(OAuthFlowError);
  });
});

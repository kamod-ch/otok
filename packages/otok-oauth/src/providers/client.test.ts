import { describe, expect, it } from "vitest";
import { createGitHubClient } from "./github.js";
import { createGitLabClient } from "./gitlab.js";
import { createGoogleClient } from "./google.js";
import { createMicrosoftClient } from "./microsoft.js";

const config = {
  clientId: "client-id",
  clientSecret: "client-secret",
  redirectUri: "https://app.example.com/auth/callback",
};
const verifier = "test-code-verifier-that-is-long-enough-for-pkce";

async function authorizationURL(client: ReturnType<typeof createGitHubClient>): Promise<URL> {
  return client.createAuthorizationURL("test-state", verifier, ["openid", "profile"]);
}

describe("oauth4webapi provider clients", () => {
  it("builds GitHub authorization URLs with S256 PKCE", async () => {
    const url = await authorizationURL(createGitHubClient(config));

    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe(config.clientId);
    expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(url.searchParams.get("state")).toBe("test-state");
    expect(url.searchParams.get("scope")).toBe("openid profile");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
  });

  it.each([
    ["Google", createGoogleClient(config), "https://accounts.google.com/o/oauth2/v2/auth"],
    ["Microsoft", createMicrosoftClient(config), "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"],
    ["GitLab", createGitLabClient(config), "https://gitlab.com/oauth/authorize"],
  ])("uses the expected %s authorization endpoint", async (_name, client, expected) => {
    const url = await authorizationURL(client);
    expect(url.origin + url.pathname).toBe(expected);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("supports a self-hosted GitLab base URL", async () => {
    const url = await authorizationURL(createGitLabClient({ ...config, baseURL: "https://gitlab.example.com/" }));
    expect(url.origin + url.pathname).toBe("https://gitlab.example.com/oauth/authorize");
  });
});

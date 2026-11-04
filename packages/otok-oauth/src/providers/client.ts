import * as oauth from "oauth4webapi";
import type { OAuthProviderConfig } from "./types.js";

export type OAuthProviderDefinition = {
  authorizationServer: oauth.AuthorizationServer;
};

export type OAuthProviderTokens = {
  accessToken(): string;
  hasRefreshToken(): boolean;
  refreshToken(): string;
};

/**
 * Small provider client built on oauth4webapi. Otok deliberately gets identity
 * from the provider profile endpoint, so ID tokens returned alongside OAuth
 * access tokens are not used as identity assertions here.
 */
export class OAuthProviderClient {
  readonly #config: OAuthProviderConfig;
  readonly #authorizationServer: oauth.AuthorizationServer;
  readonly #client: oauth.Client;
  readonly #clientAuthentication: oauth.ClientAuth;

  constructor(config: OAuthProviderConfig, definition: OAuthProviderDefinition) {
    this.#config = config;
    this.#authorizationServer = definition.authorizationServer;
    this.#client = { client_id: config.clientId };
    this.#clientAuthentication = oauth.ClientSecretBasic(config.clientSecret);
  }

  async createAuthorizationURL(state: string, codeVerifier: string, scopes: readonly string[]): Promise<URL> {
    const endpoint = this.#authorizationServer.authorization_endpoint;
    if (!endpoint) throw new Error("OAuth provider is missing an authorization endpoint");

    const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);
    const url = new URL(endpoint);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", this.#client.client_id);
    url.searchParams.set("redirect_uri", this.#config.redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    if (scopes.length > 0) url.searchParams.set("scope", scopes.join(" "));
    return url;
  }

  async validateAuthorizationCode(code: string, codeVerifier: string, state: string): Promise<OAuthProviderTokens> {
    const callbackParameters = oauth.validateAuthResponse(
      this.#authorizationServer,
      this.#client,
      new URLSearchParams({ code, state }),
      state,
    );
    const response = await oauth.authorizationCodeGrantRequest(
      this.#authorizationServer,
      this.#client,
      this.#clientAuthentication,
      callbackParameters,
      this.#config.redirectUri,
      codeVerifier,
    );
    const tokenResponse = await processOAuthTokenResponse(this.#authorizationServer, this.#client, response);

    return {
      accessToken: () => tokenResponse.access_token,
      hasRefreshToken: () => typeof tokenResponse.refresh_token === "string",
      refreshToken: () => {
        if (typeof tokenResponse.refresh_token !== "string") throw new Error("OAuth response has no refresh token");
        return tokenResponse.refresh_token;
      },
    };
  }
}

async function processOAuthTokenResponse(
  authorizationServer: oauth.AuthorizationServer,
  client: oauth.Client,
  response: Response,
): Promise<oauth.TokenEndpointResponse> {
  // This package uses the provider's profile endpoint as the identity source.
  // Removing an unused ID token avoids treating this OAuth flow as an OIDC flow
  // and, in particular, avoids invalid issuer assumptions for Entra multi-tenant
  // (`common`) applications. oauth4webapi still validates the OAuth response.
  const body: unknown = await response.json();
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("OAuth token endpoint returned an invalid response");
  }

  const oauthBody = { ...(body as Record<string, unknown>) };
  delete oauthBody.id_token;
  const headers = new Headers(response.headers);
  headers.set("content-type", "application/json");
  const normalizedResponse = new Response(JSON.stringify(oauthBody), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  return oauth.processAuthorizationCodeResponse(authorizationServer, client, normalizedResponse);
}

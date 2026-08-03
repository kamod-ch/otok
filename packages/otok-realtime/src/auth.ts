import type { Context } from "hono";
import type { AuthTokenResult, RealtimeUser } from "./types.js";
import { RealtimeException } from "./errors.js";

const BEARER_PREFIX = "Bearer ";

/** Resolve auth from Authorization header or session context — never from query params. */
export async function resolveAuthToken(
  c: Context,
  options: {
    contextUserKey?: string;
    getSession?: (c: Context) => Promise<RealtimeUser | null>;
  } = {},
): Promise<AuthTokenResult> {
  rejectQueryToken(c);

  const authHeader = c.req.header("authorization");
  if (authHeader?.startsWith(BEARER_PREFIX)) {
    const token = authHeader.slice(BEARER_PREFIX.length).trim();
    if (!token) {
      throw new RealtimeException("INVALID_TOKEN", "Empty bearer token");
    }
    const user = await decodeBearerToken(token);
    return { user, source: "bearer" };
  }

  const contextKey = options.contextUserKey ?? "user";
  const contextUser = c.get(contextKey as never) as RealtimeUser | undefined;
  if (contextUser?.id) {
    return { user: contextUser, source: "session" };
  }

  if (options.getSession) {
    const sessionUser = await options.getSession(c);
    if (sessionUser?.id) {
      return { user: sessionUser, source: "session" };
    }
  }

  return { user: null, source: "none" };
}

function rejectQueryToken(c: Context): void {
  const url = new URL(c.req.url);
  const forbidden = ["token", "access_token", "auth", "jwt", "bearer"];
  for (const param of forbidden) {
    if (url.searchParams.has(param)) {
      throw new RealtimeException(
        "INVALID_TOKEN",
        "Tokens must not be passed via query parameters. Use Authorization header or session cookie.",
      );
    }
  }
}

/** Placeholder — apps should replace via plugin option `verifyBearerToken`. */
async function decodeBearerToken(token: string): Promise<RealtimeUser | null> {
  if (token.startsWith("user:")) {
    return { id: token.slice(5) };
  }
  return null;
}

export type BearerTokenVerifier = (token: string) => Promise<RealtimeUser | null>;

export function createBearerVerifier(fn: BearerTokenVerifier): BearerTokenVerifier {
  return fn;
}

/** Redact tokens from log strings. */
export function redactTokens(input: string): string {
  return input
    .replace(/Bearer\s+[A-Za-z0-9._\-+/=]+/gi, "Bearer [REDACTED]")
    .replace(/(token|access_token|auth)=([^&\s]+)/gi, "$1=[REDACTED]");
}

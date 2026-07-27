/** Serializable session fixture for cookie-based auth tests. */
export interface OtokTestSession {
  /** Cookie name/value pairs sent with requests. */
  cookies: Record<string, string>;
  /** Optional user summary for auth middleware mocks (never serialized to real tokens). */
  user?: {
    id: string;
    email?: string;
    roles?: string[];
    [key: string]: unknown;
  };
}

export interface CreateTestSessionInput {
  id?: string;
  email?: string;
  roles?: string[];
  cookies?: Record<string, string>;
  /** Default session cookie name when only `id` is provided. */
  sessionCookieName?: string;
}

/** Build a test session with deterministic cookie values. */
export function createTestSession(input: CreateTestSessionInput = {}): OtokTestSession {
  const sessionCookieName = input.sessionCookieName ?? "otok_session";
  const cookies = { ...input.cookies };
  if (input.id && !(sessionCookieName in cookies)) {
    cookies[sessionCookieName] = `test-session-${input.id}`;
  }

  const user = input.id
    ? {
        id: input.id,
        email: input.email,
        roles: input.roles,
      }
    : undefined;

  return { cookies, user };
}

/** Alias used in docs and examples. */
export const authenticatedSession = createTestSession({ id: "user-1", email: "user@example.com" });

export function sessionCookieHeader(session: OtokTestSession): string {
  return Object.entries(session.cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

export function mergeSessionHeaders(
  init: RequestInit | undefined,
  session?: OtokTestSession,
  cookies?: Record<string, string>,
): RequestInit {
  const headers = new Headers(init?.headers);
  const mergedCookies = { ...session?.cookies, ...cookies };
  const cookieHeader = Object.entries(mergedCookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  if (cookieHeader) headers.set("cookie", cookieHeader);
  return { ...init, headers };
}

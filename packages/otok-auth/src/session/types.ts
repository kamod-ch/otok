import type { Context } from "hono";

export interface SessionConfig {
  sessionCookie: string;
  csrfCookie?: string;
  maxAgeSeconds?: number;
  secure?: boolean | ((c: Context) => boolean);
  sameSite?: "Strict" | "Lax" | "None";
  path?: string;
  /** Rotate session token after this interval (seconds). Defaults to half of maxAgeSeconds. */
  rotationIntervalSeconds?: number;
}

export interface CreateSessionRecordInput {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface ResolvedSessionRecord {
  tokenHash: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

/** Replacement row for {@link SessionAdapter.rotateRecord} (hashed token only, never raw). */
export interface SessionRotationReplacement {
  newTokenHash: string;
  userId: string;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface SessionAdapter<TUser> {
  createRecord(input: CreateSessionRecordInput): Promise<void>;
  revokeRecord(tokenHash: string): Promise<void>;
  resolveUser(tokenHash: string): Promise<TUser | null>;
  touchRecord?(tokenHash: string): Promise<void>;
  /** Active, unrevoked, unexpired session metadata for rotation decisions. */
  resolveRecord?(tokenHash: string): Promise<ResolvedSessionRecord | null>;
  /**
   * Atomically revoke the active session for `oldTokenHash` and insert `replacement` in one transaction.
   * `true` when this call committed the rotation; `false` when the old session is no longer active.
   * Not safe under concurrency unless implemented (Kysely/Memory adapters do); legacy revoke+create is not atomic.
   */
  rotateRecord?(oldTokenHash: string, replacement: SessionRotationReplacement): Promise<boolean>;
}

export interface SessionManager<TUser> {
  createSession(c: Context, userId: string): Promise<void>;
  revokeSession(c: Context): Promise<void>;
  /** Re-issue session cookie with a new token for the same user (rotation). */
  rotateSession(c: Context): Promise<void>;
  getSessionUser(c: Context): Promise<TUser | null>;
  readonly config: Required<Pick<SessionConfig, "sessionCookie" | "maxAgeSeconds">> & SessionConfig;
}

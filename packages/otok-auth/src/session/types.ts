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

export interface SessionAdapter<TUser> {
  createRecord(input: CreateSessionRecordInput): Promise<void>;
  revokeRecord(tokenHash: string): Promise<void>;
  resolveUser(tokenHash: string): Promise<TUser | null>;
  touchRecord?(tokenHash: string): Promise<void>;
  /** Return session metadata for rotation decisions. */
  resolveRecord?(tokenHash: string): Promise<ResolvedSessionRecord | null>;
}

export interface SessionManager<TUser> {
  createSession(c: Context, userId: string): Promise<void>;
  revokeSession(c: Context): Promise<void>;
  /** Re-issue session cookie with a new token for the same user (rotation). */
  rotateSession(c: Context): Promise<void>;
  getSessionUser(c: Context): Promise<TUser | null>;
  readonly config: Required<Pick<SessionConfig, "sessionCookie" | "maxAgeSeconds">> & SessionConfig;
}

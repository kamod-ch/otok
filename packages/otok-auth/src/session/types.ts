import type { Context } from "hono";

export interface SessionConfig {
  sessionCookie: string;
  csrfCookie?: string;
  maxAgeSeconds?: number;
  secure?: boolean | ((c: Context) => boolean);
  sameSite?: "Strict" | "Lax" | "None";
  path?: string;
}

export interface CreateSessionRecordInput {
  tokenHash: string;
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
}

export interface SessionManager<TUser> {
  createSession(c: Context, userId: string): Promise<void>;
  revokeSession(c: Context): Promise<void>;
  getSessionUser(c: Context): Promise<TUser | null>;
  readonly config: Required<Pick<SessionConfig, "sessionCookie" | "maxAgeSeconds">> & SessionConfig;
}

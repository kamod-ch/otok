import type { CreateSessionRecordInput, SessionAdapter } from "../session/types.js";

export interface MemorySessionRecord {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
  revokedAt: Date | null;
  lastSeenAt: Date | null;
}

export interface MemorySessionPersistence {
  load: () => MemorySessionRecord[] | Promise<MemorySessionRecord[]>;
  save: (sessions: MemorySessionRecord[]) => void | Promise<void>;
}

export interface MemorySessionAdapterOptions<TUser> {
  resolveUser: (input: {
    tokenHash: string;
    session: MemorySessionRecord;
  }) => Promise<TUser | null> | TUser | null;
  persistence?: MemorySessionPersistence;
  /** Used when no persistence hook is configured (mainly tests). */
  initialSessions?: MemorySessionRecord[];
}

function isActive(session: MemorySessionRecord, now = Date.now()): boolean {
  return !session.revokedAt && session.expiresAt.getTime() > now;
}

export function createMemorySessionAdapter<TUser>(
  options: MemorySessionAdapterOptions<TUser>,
): SessionAdapter<TUser> {
  let sessions: MemorySessionRecord[] = [];
  let loaded = false;

  async function ensureLoaded(): Promise<void> {
    if (loaded) return;
    sessions = options.persistence
      ? [...(await options.persistence.load())]
      : [...(options.initialSessions ?? [])];
    loaded = true;
  }

  async function persist(): Promise<void> {
    if (options.persistence) {
      await options.persistence.save(sessions);
    }
  }

  return {
    async createRecord(input: CreateSessionRecordInput) {
      await ensureLoaded();
      sessions = sessions.filter((session) => session.tokenHash !== input.tokenHash);
      sessions.push({
        tokenHash: input.tokenHash,
        userId: input.userId,
        expiresAt: input.expiresAt,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        revokedAt: null,
        lastSeenAt: null,
      });
      await persist();
    },
    async revokeRecord(tokenHash) {
      await ensureLoaded();
      const session = sessions.find((entry) => entry.tokenHash === tokenHash);
      if (session) session.revokedAt = new Date();
      await persist();
    },
    async resolveUser(tokenHash) {
      await ensureLoaded();
      const session = sessions.find((entry) => entry.tokenHash === tokenHash && isActive(entry));
      if (!session) return null;
      return options.resolveUser({ tokenHash, session });
    },
    async touchRecord(tokenHash) {
      await ensureLoaded();
      const session = sessions.find((entry) => entry.tokenHash === tokenHash);
      if (!session) return;
      session.lastSeenAt = new Date();
      await persist();
    },
  };
}

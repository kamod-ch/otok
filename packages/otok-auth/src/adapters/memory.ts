import type { CreateSessionRecordInput, SessionAdapter, SessionRotationReplacement } from "../session/types.js";

export interface MemorySessionRecord {
  tokenHash: string;
  userId: string;
  createdAt: Date;
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
  resolveUser: (input: { tokenHash: string; session: MemorySessionRecord }) => Promise<TUser | null> | TUser | null;
  persistence?: MemorySessionPersistence;
  /** Used when no persistence hook is configured (mainly tests). */
  initialSessions?: MemorySessionRecord[];
}

function isActive(session: MemorySessionRecord, now = Date.now()): boolean {
  return !session.revokedAt && session.expiresAt.getTime() > now;
}

export function createMemorySessionAdapter<TUser>(options: MemorySessionAdapterOptions<TUser>): SessionAdapter<TUser> {
  let sessions: MemorySessionRecord[] = [];
  let loaded = false;
  let gate: Promise<void> = Promise.resolve();

  async function withExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const previous = gate;
    let release!: () => void;
    gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  async function ensureLoaded(): Promise<void> {
    if (loaded) return;
    sessions = options.persistence ? [...(await options.persistence.load())] : [...(options.initialSessions ?? [])];
    loaded = true;
  }

  async function persist(): Promise<void> {
    if (options.persistence) {
      await options.persistence.save(sessions);
    }
  }

  return {
    async createRecord(input: CreateSessionRecordInput) {
      await withExclusive(async () => {
        await ensureLoaded();
        sessions = sessions.filter((session) => session.tokenHash !== input.tokenHash);
        sessions.push({
          tokenHash: input.tokenHash,
          userId: input.userId,
          createdAt: new Date(),
          expiresAt: input.expiresAt,
          userAgent: input.userAgent,
          ipAddress: input.ipAddress,
          revokedAt: null,
          lastSeenAt: null,
        });
        await persist();
      });
    },
    async revokeRecord(tokenHash) {
      await withExclusive(async () => {
        await ensureLoaded();
        const session = sessions.find((entry) => entry.tokenHash === tokenHash);
        if (session) session.revokedAt = new Date();
        await persist();
      });
    },
    async resolveUser(tokenHash) {
      await ensureLoaded();
      const session = sessions.find((entry) => entry.tokenHash === tokenHash && isActive(entry));
      if (!session) return null;
      return options.resolveUser({ tokenHash, session });
    },
    async touchRecord(tokenHash) {
      await withExclusive(async () => {
        await ensureLoaded();
        const session = sessions.find((entry) => entry.tokenHash === tokenHash);
        if (!session) return;
        session.lastSeenAt = new Date();
        await persist();
      });
    },
    async resolveRecord(tokenHash) {
      await ensureLoaded();
      const session = sessions.find((entry) => entry.tokenHash === tokenHash && isActive(entry));
      if (!session) return null;
      return {
        tokenHash: session.tokenHash,
        userId: session.userId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      };
    },
    async rotateRecord(oldTokenHash: string, replacement: SessionRotationReplacement): Promise<boolean> {
      return withExclusive(async () => {
        await ensureLoaded();
        const snapshot = sessions.map((session) => ({ ...session }));
        const session = sessions.find((entry) => entry.tokenHash === oldTokenHash && isActive(entry));
        if (!session) return false;

        session.revokedAt = new Date();
        sessions.push({
          tokenHash: replacement.newTokenHash,
          userId: replacement.userId,
          createdAt: new Date(),
          expiresAt: replacement.expiresAt,
          userAgent: replacement.userAgent,
          ipAddress: replacement.ipAddress,
          revokedAt: null,
          lastSeenAt: null,
        });

        try {
          await persist();
          return true;
        } catch (error) {
          sessions = snapshot;
          throw error;
        }
      });
    },
  };
}

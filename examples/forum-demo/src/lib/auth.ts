import type { ForumAuthAdapter, ForumRequestContext, ForumUser } from "@kamod-ch/otok-forum";

const DEMO_USERS: Record<string, ForumUser> = {
  alice: { id: "alice", displayName: "Alice Member", roles: ["member"] },
  bob: { id: "bob", displayName: "Bob Moderator", roles: ["moderator"] },
  admin: { id: "admin", displayName: "Admin", roles: ["admin"] },
};

let currentUserId: string | null = "alice";

export function createDemoAuthAdapter(): ForumAuthAdapter {
  return {
    async getCurrentUser(ctx: ForumRequestContext) {
      void ctx;
      if (!currentUserId) return null;
      return DEMO_USERS[currentUserId] ?? null;
    },
  };
}

export function setDemoUser(id: string | null) {
  currentUserId = id;
}

export { DEMO_USERS };

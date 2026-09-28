import { createMemoryDiscussionAdapter } from "../adapters/memory/index.js";
import type { MemoryDiscussionStore } from "../adapters/memory/store.js";
import type { DiscussionActor, DiscussionSubject } from "../types/domain.js";
import { DiscussionError } from "../types/errors.js";
import type {
  ActorResolver,
  DiscussionPolicy,
  DiscussionPolicyAction,
  DiscussionPolicyContext,
  ModerationProvider,
  SubjectResolver,
} from "../types/ports.js";

export function staticSubjectResolver(subject: DiscussionSubject): SubjectResolver {
  return {
    async resolve(ctx) {
      if (ctx.tenantId !== subject.tenantId) {
        throw new DiscussionError("SUBJECT_DENIED", "Subject not found for tenant");
      }
      return { ...subject, subjectType: ctx.subjectType, subjectId: ctx.subjectId };
    },
  };
}

export function mappingSubjectResolver(map: Record<string, DiscussionSubject>): SubjectResolver {
  return {
    async resolve(ctx) {
      const key = `${ctx.tenantId}:${ctx.subjectType}:${ctx.subjectId}`;
      const subject = map[key];
      if (!subject) {
        throw new DiscussionError("NOT_FOUND", "Subject resource not found");
      }
      return subject;
    },
  };
}

export function actorDirectory(actors: Record<string, DiscussionActor>): ActorResolver {
  return {
    async resolveActor(ctx) {
      return actors[ctx.userId] ?? null;
    },
  };
}

export function allowPolicy(except?: DiscussionPolicyAction[]): DiscussionPolicy {
  const denied = new Set(except ?? []);
  return {
    async can(_ctx: DiscussionPolicyContext, action: DiscussionPolicyAction) {
      return !denied.has(action);
    },
  };
}

export function denyAnonymousReadPolicy(): DiscussionPolicy {
  return {
    async can(ctx, action) {
      if (!ctx.actor && (action === "comment:read" || action === "thread:read")) {
        return false;
      }
      return true;
    },
  };
}

export function moderationForTenants(...tenantIds: string[]): ModerationProvider {
  const set = new Set(tenantIds);
  return {
    async isModerator(actor, subject) {
      return set.has(subject.tenantId) && actor.roles.includes("moderator");
    },
  };
}

export function moderationWithSuperAdmin(...tenantIds: string[]): {
  provider: ModerationProvider;
  access: import("../moderation/access.js").ModerationAccessOptions;
} {
  return {
    provider: moderationForTenants(...tenantIds),
    access: { superAdminRole: "discussions_superadmin", moderatableTenantIds: tenantIds },
  };
}

/** Test helper — memory adapter attaches `_store` at runtime. */
export function memoryAdapterStore(
  adapter: ReturnType<typeof createMemoryDiscussionAdapter>,
): MemoryDiscussionStore {
  return (adapter as ReturnType<typeof createMemoryDiscussionAdapter> & { _store: MemoryDiscussionStore })._store;
}

import type { OtokContext } from "@kamod-ch/otok/server";
import type { DiscussionsAuthAdapter, DiscussionsVerifiedScope } from "../http/types.js";

export interface MutableDiscussionsAuth extends DiscussionsAuthAdapter {
  setScope(scope: DiscussionsVerifiedScope): void;
}

export function createMutableDiscussionsAuth(initial?: Partial<DiscussionsVerifiedScope>): MutableDiscussionsAuth {
  const state: DiscussionsVerifiedScope = {
    tenantId: initial?.tenantId ?? "tenant-a",
    sessionUserId: initial?.sessionUserId ?? null,
  };
  return {
    usesCookieSession: true,
    setScope(scope) {
      state.tenantId = scope.tenantId;
      state.sessionUserId = scope.sessionUserId;
    },
    async resolveVerifiedScope(_ctx: OtokContext) {
      return { ...state };
    },
  };
}

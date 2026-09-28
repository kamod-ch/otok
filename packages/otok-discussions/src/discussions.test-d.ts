import { expectTypeOf, it } from "vitest";
import type { DiscussionComment, DiscussionSubject } from "./types/domain.js";
import type { DiscussionAdapter } from "./types/ports.js";
import { requireAdapterPort } from "./types/ports.js";

it("DiscussionSubject requires tenant and subject keys", () => {
  expectTypeOf<DiscussionSubject>().toEqualTypeOf<{
    tenantId: string;
    subjectType: string;
    subjectId: string;
  }>();
});

it("requireAdapterPort narrows read port", () => {
  const adapter: DiscussionAdapter = {
    capabilities: { read: true, mutate: false, moderate: false, transactional: false },
    read: {
      getThread: async () => null,
      listThreads: async () => ({ items: [] }),
      getComment: async () => null,
      listComments: async () => ({ items: [] }),
      listRevisions: async () => [],
      listReactions: async () => [],
    },
  };
  const read = requireAdapterPort(adapter, "read", "read");
  expectTypeOf(read.listThreads).toBeFunction();
  expectTypeOf<DiscussionComment["status"]>().toEqualTypeOf<
    "pending" | "published" | "rejected" | "hidden" | "deleted"
  >();
});

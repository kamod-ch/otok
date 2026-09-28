import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createKyselyDiscussionAdapter } from "@kamod-ch/otok-discussions/kysely";
import { createDiscussionsRuntime } from "@kamod-ch/otok-discussions";
import { ensureRefDb, refConnectionString, destroyRefDb } from "../src/db/client.js";
import { ARTICLE_OPEN, TENANT_A } from "../src/db/types.js";

const pgUrl = refConnectionString();
const canPg = pgUrl.includes("localhost") || pgUrl.includes("127.0.0.1");

describe.skipIf(!canPg)("discussions-reference integration (postgres)", () => {
  beforeAll(async () => {
    await ensureRefDb();
  });

  afterAll(async () => {
    await destroyRefDb();
  });

  it("concurrent reactions keep a single active reaction per actor", async () => {
    const db = await ensureRefDb();
    const deps = {
      clock: { now: () => new Date() },
      ids: {
        createId: (p?: string) => `${p ?? "id"}_${Math.random().toString(36).slice(2, 10)}`,
      },
      events: { emit: () => {} },
    };
    const adapter = createKyselyDiscussionAdapter({
      db,
      deps,
      config: { moderationMode: "post", maxDepth: 4 },
    });
    const subject = { tenantId: TENANT_A, subjectType: "article" as const, subjectId: ARTICLE_OPEN };
    const threads = await adapter.read!.listThreads({ subject, limit: 1 });
    const threadId = threads.items[0]?.id;
    expect(threadId).toBeTruthy();
    const page = await adapter.read!.listComments({
      subject,
      threadId: threadId!,
      limit: 5,
      sort: "newest",
    });
    const commentId = page.items[0]?.id;
    expect(commentId).toBeTruthy();

    const voter = "concurrency-voter-ref";
    await Promise.allSettled([
      adapter.mutate!.addReaction(subject, commentId!, voter, "👍"),
      adapter.mutate!.addReaction(subject, commentId!, voter, "👎"),
    ]);
    const reactions = await adapter.read!.listReactions!(subject, commentId!);
    expect(reactions.filter((r) => r.actorId === voter)).toHaveLength(1);
  });
});

void createDiscussionsRuntime;

/**
 * Compile fixture: external consumer shape for public export subpaths.
 * Run after build: pnpm typecheck:fixtures
 */
import { parseDiscussionsConfig, type DiscussionSubject, type DiscussionsConfig } from "@kamod-ch/otok-discussions";
import { createMemoryDiscussionAdapter } from "@kamod-ch/otok-discussions/adapters/memory";
import { createTestProviders, TestClock } from "@kamod-ch/otok-discussions/testing";
import type { DiscussionsDatabase } from "@kamod-ch/otok-discussions/kysely";
import type { CreateDiscussionsOptions } from "@kamod-ch/otok-discussions/plugin";
import type { DiscussionProps } from "@kamod-ch/otok-discussions/ui";

const config: DiscussionsConfig = parseDiscussionsConfig({});
void config;

const subject: DiscussionSubject = {
  tenantId: "tenant-a",
  subjectType: "document",
  subjectId: "doc-9",
};

const deps = createTestProviders();
const adapter = createMemoryDiscussionAdapter({ deps });
void adapter.read?.listComments({ subject, threadId: "thread-1", sort: "newest" });

const clock = new TestClock({ iso: "2026-06-01T12:00:00.000Z" });
void clock.now();

void (null as unknown as DiscussionsDatabase);
void (null as unknown as CreateDiscussionsOptions);
void (null as unknown as DiscussionProps);

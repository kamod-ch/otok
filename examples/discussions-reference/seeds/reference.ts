import type { Kysely } from "kysely";
import {
  ARTICLE_CLOSED,
  ARTICLE_MODERATED,
  ARTICLE_OPEN,
  TENANT_A,
  TENANT_B,
  USER_A_ADMIN,
  USER_A_MOD,
  USER_A_READER,
  USER_A_TRUSTED,
  USER_B_ADMIN,
  USER_B_MOD,
  USER_B_READER,
  type RefDatabase,
} from "../src/db/types.js";
import type { DiscussionsDatabase } from "@kamod-ch/otok-discussions/kysely";
import { referencePasswordHash } from "../src/lib/seed-password.js";
import { createKyselyDiscussionAdapter } from "@kamod-ch/otok-discussions/kysely";
import { canonicalThreadId, createDiscussionsRuntime } from "@kamod-ch/otok-discussions";

type SeedDb = Kysely<RefDatabase & DiscussionsDatabase>;

const SEED_MARKER = "discussions-reference-seed-v1";

export default async function seed(db: SeedDb) {
  const existing = await db.selectFrom("tenant").select("id").where("id", "=", TENANT_A).executeTakeFirst();
  if (existing) return;

  const now = new Date().toISOString();
  const passwordHash = referencePasswordHash();

  await db
    .insertInto("tenant")
    .values([
      { id: TENANT_A, slug: "tenant-a", name: "Redaktion A", created_at: now },
      { id: TENANT_B, slug: "tenant-b", name: "Redaktion B", created_at: now },
    ])
    .execute();

  await db
    .insertInto("app_user")
    .values([
      {
        id: USER_A_READER,
        email: "reader.a@ref.local",
        display_name: "Leser A",
        password_hash: passwordHash,
        created_at: now,
      },
      {
        id: USER_A_TRUSTED,
        email: "trusted.a@ref.local",
        display_name: "Trusted A",
        password_hash: passwordHash,
        created_at: now,
      },
      { id: USER_A_MOD, email: "mod.a@ref.local", display_name: "Mod A", password_hash: passwordHash, created_at: now },
      {
        id: USER_A_ADMIN,
        email: "admin.a@ref.local",
        display_name: "Admin A",
        password_hash: passwordHash,
        created_at: now,
      },
      {
        id: USER_B_READER,
        email: "reader.b@ref.local",
        display_name: "Leser B",
        password_hash: passwordHash,
        created_at: now,
      },
      { id: USER_B_MOD, email: "mod.b@ref.local", display_name: "Mod B", password_hash: passwordHash, created_at: now },
      {
        id: USER_B_ADMIN,
        email: "admin.b@ref.local",
        display_name: "Admin B",
        password_hash: passwordHash,
        created_at: now,
      },
    ])
    .execute();

  await db
    .insertInto("tenant_member")
    .values([
      { tenant_id: TENANT_A, user_id: USER_A_READER, roles: ["reader"], created_at: now },
      { tenant_id: TENANT_A, user_id: USER_A_TRUSTED, roles: ["reader", "trusted"], created_at: now },
      { tenant_id: TENANT_A, user_id: USER_A_MOD, roles: ["moderator"], created_at: now },
      { tenant_id: TENANT_A, user_id: USER_A_ADMIN, roles: ["admin"], created_at: now },
      { tenant_id: TENANT_B, user_id: USER_B_READER, roles: ["reader"], created_at: now },
      { tenant_id: TENANT_B, user_id: USER_B_MOD, roles: ["moderator"], created_at: now },
      { tenant_id: TENANT_B, user_id: USER_B_ADMIN, roles: ["admin"], created_at: now },
    ])
    .execute();

  await db
    .insertInto("article")
    .values([
      {
        id: "article-open",
        tenant_id: TENANT_A,
        slug: ARTICLE_OPEN,
        title: "Offene Debatte: Remote oder Büro?",
        teaser: "Lesermeinungen zur Zukunft der Arbeit — Thread offen für neue Kommentare.",
        body: "In der Redaktion A diskutieren wir, ob hybride Modelle langfristig tragen. **Was ist eure Erfahrung?**",
        thread_kind: "open",
        created_at: now,
      },
      {
        id: "article-closed",
        tenant_id: TENANT_A,
        slug: ARTICLE_CLOSED,
        title: "Archiv: Sommerfest 2024",
        teaser: "Rückblick auf ein geschlossenes Event — Kommentare sind beendet.",
        body: "Das Sommerfest ist vorbei. Danke an alle Helferinnen und Helfer.",
        thread_kind: "closed",
        created_at: now,
      },
      {
        id: "article-mod",
        tenant_id: TENANT_A,
        slug: ARTICLE_MODERATED,
        title: "Moderierter Talk: KI in der Redaktion",
        teaser: "Neue Stimmen erscheinen nach Freigabe — trusted Nutzer sofort live.",
        body: "Wir sammeln vorsichtig Perspektiven zur KI-Nutzung im Newsroom.",
        thread_kind: "moderated",
        created_at: now,
      },
    ])
    .execute();

  const deps = {
    clock: { now: () => new Date(now) },
    ids: {
      createId: (prefix?: string) => `${prefix ?? "id"}_${SEED_MARKER}`,
    },
    events: { emit: () => {} },
  };

  let idCounter = 0;
  deps.ids.createId = (prefix?: string) => {
    idCounter += 1;
    return `${prefix ?? "id"}_seed_${idCounter.toString().padStart(3, "0")}`;
  };

  const adapter = createKyselyDiscussionAdapter({
    db,
    deps,
    config: { moderationMode: "post", trustedRole: "discussions_trusted", maxDepth: 6 },
  });
  const runtime = createDiscussionsRuntime({}, deps);

  const subjectOpen = { tenantId: TENANT_A, subjectType: "article" as const, subjectId: ARTICLE_OPEN };
  const subjectClosed = { tenantId: TENANT_A, subjectType: "article" as const, subjectId: ARTICLE_CLOSED };
  const subjectMod = { tenantId: TENANT_A, subjectType: "article" as const, subjectId: ARTICLE_MODERATED };

  const openThread = await adapter.mutate!.createThread({
    id: canonicalThreadId(subjectOpen),
    subject: subjectOpen,
    title: "Diskussion",
    createdById: USER_A_MOD,
  });

  const top1 = await adapter.mutate!.createComment({
    subject: subjectOpen,
    threadId: openThread.id,
    authorId: USER_A_TRUSTED,
    authorRoles: ["discussions_trusted"],
    bodyMarkdown: "Hybrid funktioniert, wenn Teams klare Core-Hours haben.",
  });
  await adapter.mutate!.createComment({
    subject: subjectOpen,
    threadId: openThread.id,
    authorId: USER_A_READER,
    parentCommentId: top1.id,
    bodyMarkdown: "Stimme zu — wichtig ist Vertrauen, nicht Kontrolle.",
  });
  const deletedParent = await adapter.mutate!.createComment({
    subject: subjectOpen,
    threadId: openThread.id,
    authorId: USER_A_READER,
    bodyMarkdown: "Dieser Beitrag wurde später entfernt.",
  });
  await adapter.mutate!.createComment({
    subject: subjectOpen,
    threadId: openThread.id,
    authorId: USER_A_TRUSTED,
    parentCommentId: deletedParent.id,
    bodyMarkdown: "Antwort unter gelöschtem Parent — Platzhalter bleibt sichtbar.",
  });
  await adapter.mutate!.deleteComment!(subjectOpen, deletedParent.id);
  await adapter.mutate!.addReaction!(subjectOpen, top1.id, USER_A_READER, "👍");

  const closedThread = await adapter.mutate!.createThread({
    id: canonicalThreadId(subjectClosed),
    subject: subjectClosed,
    title: "Diskussion",
    createdById: USER_A_MOD,
  });
  await adapter.mutate!.createComment({
    subject: subjectClosed,
    threadId: closedThread.id,
    authorId: USER_A_READER,
    bodyMarkdown: "Schönes Fest — danke ans Team!",
  });
  await adapter.moderate!.transitionThread(subjectClosed, closedThread.id, "closed", USER_A_MOD);

  const modThread = await adapter.mutate!.createThread({
    id: canonicalThreadId(subjectMod),
    subject: subjectMod,
    title: "Diskussion",
    createdById: USER_A_MOD,
  });
  await adapter.mutate!.createComment({
    subject: subjectMod,
    threadId: modThread.id,
    authorId: USER_A_TRUSTED,
    authorRoles: ["discussions_trusted"],
    bodyMarkdown: "KI als Recherche-Assistent — ja, mit klaren Quellenregeln.",
  });
  await adapter.mutate!.createComment({
    subject: subjectMod,
    threadId: modThread.id,
    authorId: USER_A_READER,
    authorRoles: ["reader"],
    initialStatus: "pending",
    bodyMarkdown: "Ausstehend: neue Leserstimme zur KI.",
  });

  await adapter.moderate!.createReport({
    subject: subjectOpen,
    targetType: "comment",
    targetId: top1.id,
    reporterId: USER_A_READER,
    reason: "off_topic",
    details: "Seed report for moderation queue demo",
  });

  void runtime;
}

import type { Kysely } from "kysely";
import type { SaasDatabase } from "../src/db/types.js";
import { DEMO_ORG_ID, DEMO_USER_ID } from "../src/db/types.js";
import { hashPassword } from "../src/lib/password.js";
import { newId } from "../src/lib/ids.js";

export default async function seed(db: Kysely<SaasDatabase>) {
  const existing = await db
    .selectFrom("organization")
    .select("id")
    .where("id", "=", DEMO_ORG_ID)
    .executeTakeFirst();
  if (existing) return;

  const now = new Date().toISOString();
  const demoPassword = hashPassword("demo-password");

  await db
    .insertInto("app_user")
    .values([
      {
        id: DEMO_USER_ID,
        email: "demo@example.com",
        name: "Demo Owner",
        password_hash: demoPassword,
        created_at: now,
      },
      {
        id: "user-member",
        email: "member@example.com",
        name: "Demo Member",
        password_hash: demoPassword,
        created_at: now,
      },
    ])
    .execute();

  await db
    .insertInto("organization")
    .values({
      id: DEMO_ORG_ID,
      slug: "demo-org",
      name: "Demo Organization",
      owner_id: DEMO_USER_ID,
      created_at: now,
    })
    .execute();

  await db
    .insertInto("org_member")
    .values([
      { org_id: DEMO_ORG_ID, user_id: DEMO_USER_ID, role: "owner", created_at: now },
      { org_id: DEMO_ORG_ID, user_id: "user-member", role: "member", created_at: now },
    ])
    .execute();

  await db
    .insertInto("billing_record")
    .values({
      workspace_id: DEMO_ORG_ID,
      plan: "free",
      stripe_customer_id: null,
      stripe_subscription_id: null,
      updated_at: now,
    } as never)
    .execute();

  await db
    .insertInto("audit_log")
    .values({
      id: newId("audit"),
      tenant_id: DEMO_ORG_ID,
      actor_id: DEMO_USER_ID,
      actor: JSON.stringify({ id: DEMO_USER_ID, type: "user", email: "demo@example.com" }),
      action: "org.created",
      resource_type: "organization",
      resource_id: DEMO_ORG_ID,
      resource_name: "Demo Organization",
      occurred_at: now,
      changes: null,
      metadata: JSON.stringify({ source: "seed" }),
      request_id: null,
      correlation_id: null,
    })
    .execute();
}

import type { Kysely } from "kysely";
import type { DevjobsDatabase } from "../src/db/types.js";
import {
  COMPANY_ALPHA_ID,
  COMPANY_BETA_ID,
  USER_ALICE_ID,
  USER_BOB_ID,
} from "../src/db/types.js";
import { hashPassword } from "../src/lib/password.js";
import { newId } from "../src/lib/ids.js";

export default async function seed(db: Kysely<DevjobsDatabase>) {
  const existing = await db.selectFrom("company").select("id").where("id", "=", COMPANY_ALPHA_ID).executeTakeFirst();
  if (existing) return;

  const now = new Date().toISOString();
  const passwordHash = hashPassword("seed-password");

  await db
    .insertInto("app_user")
    .values([
      { id: USER_ALICE_ID, email: "alice@alpha.ch", name: "Alice Alpha", password_hash: passwordHash, created_at: now },
      { id: USER_BOB_ID, email: "bob@beta.ch", name: "Bob Beta", password_hash: passwordHash, created_at: now },
    ])
    .execute();

  await db
    .insertInto("company")
    .values([
      { id: COMPANY_ALPHA_ID, slug: "alpha-ag", name: "Alpha AG", created_at: now },
      { id: COMPANY_BETA_ID, slug: "beta-gmbh", name: "Beta GmbH", created_at: now },
    ])
    .execute();

  await db
    .insertInto("company_member")
    .values([
      { company_id: COMPANY_ALPHA_ID, user_id: USER_ALICE_ID, role: "owner", created_at: now },
      { company_id: COMPANY_BETA_ID, user_id: USER_BOB_ID, role: "owner", created_at: now },
    ])
    .execute();

  await db
    .insertInto("job_posting")
    .values([
      {
        id: newId("job"),
        company_id: COMPANY_ALPHA_ID,
        slug: "frontend-alpha",
        title: "Frontend Engineer Alpha",
        description: "Public role at Alpha AG with Preact and Otok.",
        visibility: "public",
        external_ref: "alpha-fe-1",
        created_by: USER_ALICE_ID,
        created_at: now,
        updated_at: now,
      },
      {
        id: newId("job"),
        company_id: COMPANY_ALPHA_ID,
        slug: "internal-alpha-hr",
        title: "Internal HR Alpha",
        description: "Private listing — tenant members only.",
        visibility: "private",
        external_ref: "alpha-hr-private",
        created_by: USER_ALICE_ID,
        created_at: now,
        updated_at: now,
      },
      {
        id: newId("job"),
        company_id: COMPANY_BETA_ID,
        slug: "backend-beta",
        title: "Backend Engineer Beta",
        description: "Public role at Beta GmbH.",
        visibility: "public",
        external_ref: "beta-be-1",
        created_by: USER_BOB_ID,
        created_at: now,
        updated_at: now,
      },
    ])
    .execute();
}

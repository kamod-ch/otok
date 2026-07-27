import type { Kysely } from "kysely";
import { hashPassword } from "../src/lib/password.js";
import type { SaasDatabase } from "../src/db/types.js";

export default async function seed(db: Kysely<SaasDatabase>) {
  const now = new Date().toISOString();
  await db
    .insertInto("users")
    .values({
      id: "user-demo",
      email: "demo@example.com",
      name: "Demo User",
      passwordHash: hashPassword("demo-password"),
      role: "admin",
      createdAt: now,
    })
    .onConflict((oc) => oc.column("email").doNothing())
    .execute();

  await db
    .insertInto("projects")
    .values([
      {
        id: "proj-1",
        userId: "user-demo",
        title: "Launch checklist",
        description: "Pre-release tasks for the SaaS starter.",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "proj-2",
        userId: "user-demo",
        title: "Customer onboarding",
        description: "Email sequence and in-app hints.",
        createdAt: now,
        updatedAt: now,
      },
    ])
    .onConflict((oc) => oc.column("id").doNothing())
    .execute();
}

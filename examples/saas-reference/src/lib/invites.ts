import type { Kysely } from "kysely";
import type { InviteRole, SaasDatabase } from "../db/types.js";
import { generateInviteToken, hashToken, newId } from "./ids.js";

const INVITE_TTL_MS = 1000 * 60 * 60 * 48;

export type CreatedInvite = {
  id: string;
  token: string;
  email: string;
  role: InviteRole;
  expiresAt: string;
};

export async function createInvitation(
  db: Kysely<SaasDatabase>,
  input: { orgId: string; email: string; role: InviteRole; invitedBy: string },
): Promise<CreatedInvite> {
  const token = generateInviteToken();
  const id = newId("inv");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  await db
    .insertInto("invitation")
    .values({
      id,
      org_id: input.orgId,
      email: input.email.toLowerCase(),
      role: input.role,
      token_hash: hashToken(token),
      expires_at: expiresAt,
      accepted_at: null,
      invited_by: input.invitedBy,
    })
    .execute();

  return { id, token, email: input.email, role: input.role, expiresAt };
}

export async function findValidInvitation(
  db: Kysely<SaasDatabase>,
  token: string,
) {
  const tokenHash = hashToken(token);
  return db
    .selectFrom("invitation")
    .innerJoin("organization", "organization.id", "invitation.org_id")
    .select([
      "invitation.id",
      "invitation.org_id",
      "invitation.email",
      "invitation.role",
      "invitation.expires_at",
      "invitation.accepted_at",
      "organization.name as org_name",
      "organization.slug as org_slug",
    ])
    .where("invitation.token_hash", "=", tokenHash)
    .where("invitation.accepted_at", "is", null)
    .where("invitation.expires_at", ">", new Date().toISOString())
    .executeTakeFirst();
}

export async function acceptInvitation(
  db: Kysely<SaasDatabase>,
  inviteId: string,
  userId: string,
  role: InviteRole,
  orgId: string,
): Promise<void> {
  await db
    .updateTable("invitation")
    .set({ accepted_at: new Date().toISOString() })
    .where("id", "=", inviteId)
    .execute();

  const existing = await db
    .selectFrom("org_member")
    .select("user_id")
    .where("org_id", "=", orgId)
    .where("user_id", "=", userId)
    .executeTakeFirst();

  if (!existing) {
    await db
      .insertInto("org_member")
      .values({ org_id: orgId, user_id: userId, role } as never)
      .execute();
  }
}

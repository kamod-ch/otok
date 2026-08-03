import type { Kysely } from "kysely";
import type { OAuthAdapter, OAuthProfile } from "@kamod-ch/otok-oauth/adapter";
import type { SaasDatabase, SaasUser } from "../db/types.js";
import { hashPassword } from "./password.js";
import { newId } from "./ids.js";

export function createOAuthAdapter(getDb: () => Kysely<SaasDatabase>): OAuthAdapter<SaasUser> {
  return {
    getUserId: (user) => user.id,
    async findOrCreateUser(profile: OAuthProfile) {
      const db = getDb();
      const existingLink = await db
        .selectFrom("oauth_account")
        .innerJoin("app_user", "app_user.id", "oauth_account.user_id")
        .select(["app_user.id", "app_user.email", "app_user.name"])
        .where("oauth_account.provider", "=", profile.provider)
        .where("oauth_account.provider_account_id", "=", profile.providerAccountId)
        .executeTakeFirst();

      if (existingLink) {
        return { id: existingLink.id, email: existingLink.email, name: existingLink.name };
      }

      const email = profile.email?.toLowerCase();
      if (email) {
        const byEmail = await db
          .selectFrom("app_user")
          .selectAll()
          .where("email", "=", email)
          .executeTakeFirst();
        if (byEmail) {
          await db
            .insertInto("oauth_account")
            .values({
              id: newId("oauth"),
              provider: profile.provider,
              provider_account_id: profile.providerAccountId,
              user_id: byEmail.id,
              created_at: new Date().toISOString(),
            } as never)
            .execute();
          return { id: byEmail.id, email: byEmail.email, name: byEmail.name };
        }
      }

      const userId = newId("user");
      const placeholderPassword = hashPassword(crypto.randomUUID());
      await db
        .insertInto("app_user")
        .values({
          id: userId,
          email: email ?? `${profile.providerAccountId}@${profile.provider}.oauth.local`,
          name: profile.name,
          password_hash: placeholderPassword,
        } as never)
        .execute();

      await db
        .insertInto("oauth_account")
        .values({
          id: newId("oauth"),
          provider: profile.provider,
          provider_account_id: profile.providerAccountId,
          user_id: userId,
          created_at: new Date().toISOString(),
        } as never)
        .execute();

      return {
        id: userId,
        email: email ?? `${profile.providerAccountId}@${profile.provider}.oauth.local`,
        name: profile.name,
      };
    },
  };
}

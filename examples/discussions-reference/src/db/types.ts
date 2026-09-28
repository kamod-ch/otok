export const TENANT_A = "tenant-a";
export const TENANT_B = "tenant-b";

export const ARTICLE_OPEN = "open-debate";
export const ARTICLE_CLOSED = "closed-archive";
export const ARTICLE_MODERATED = "moderated-piece";

export const USER_A_READER = "user-a-reader";
export const USER_A_TRUSTED = "user-a-trusted";
export const USER_A_MOD = "user-a-mod";
export const USER_A_ADMIN = "user-a-admin";
export const USER_B_READER = "user-b-reader";
export const USER_B_MOD = "user-b-mod";
export const USER_B_ADMIN = "user-b-admin";

export interface RefDatabase {
  otok_migrations: { name: string; applied_at: string };
  app_user: {
    id: string;
    email: string;
    display_name: string;
    password_hash: string;
    created_at: string;
  };
  app_session: {
    id: string;
    user_id: string;
    token_hash: string;
    user_agent: string | null;
    ip_address: string | null;
    expires_at: string;
    revoked_at: string | null;
    created_at: string;
    last_seen_at: string | null;
  };
  tenant: { id: string; slug: string; name: string; created_at: string };
  tenant_member: { tenant_id: string; user_id: string; roles: string[]; created_at: string };
  article: {
    id: string;
    tenant_id: string;
    slug: string;
    title: string;
    teaser: string;
    body: string;
    thread_kind: "open" | "closed" | "moderated";
    created_at: string;
  };
}

export type RefUser = { id: string; email: string; displayName: string };

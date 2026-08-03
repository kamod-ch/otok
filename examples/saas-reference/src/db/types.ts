import type { Generated } from "kysely";

export type SaasPlan = "free" | "pro" | "team";
export type OrgRole = "owner" | "admin" | "member";
export type InviteRole = "admin" | "member";

export type SaasPermission =
  | "dashboard:access"
  | "org:read"
  | "org:update"
  | "team:read"
  | "team:invite"
  | "team:remove"
  | "billing:read"
  | "billing:manage"
  | "audit:read";

export interface SaasDatabase {
  app_user: {
    id: string;
    email: string;
    name: string | null;
    password_hash: string;
    created_at: Generated<string>;
  };
  app_session: {
    id: Generated<string>;
    user_id: string;
    token_hash: string;
    user_agent: string | null;
    ip_address: string | null;
    expires_at: string;
    revoked_at: string | null;
    created_at: Generated<string>;
    last_seen_at: string | null;
  };
  oauth_account: {
    id: string;
    provider: string;
    provider_account_id: string;
    user_id: string;
    created_at: Generated<string>;
  };
  organization: {
    id: string;
    slug: string;
    name: string;
    owner_id: string;
    created_at: string;
  };
  org_member: {
    org_id: string;
    user_id: string;
    role: OrgRole;
    created_at: Generated<string>;
  };
  invitation: {
    id: string;
    org_id: string;
    email: string;
    role: InviteRole;
    token_hash: string;
    expires_at: string;
    accepted_at: string | null;
    invited_by: string;
    created_at: Generated<string>;
  };
  billing_record: {
    workspace_id: string;
    plan: SaasPlan;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    updated_at: string;
  };
  stripe_event: {
    event_id: string;
    processed_at: string;
  };
  audit_log: {
    id: string;
    tenant_id: string;
    actor_id: string;
    actor: string;
    action: string;
    resource_type: string;
    resource_id: string;
    resource_name: string | null;
    changes: string | null;
    occurred_at: string;
    request_id: string | null;
    correlation_id: string | null;
    metadata: string | null;
  };
}

/** Base user resolved from session (no org context). */
export type SaasUser = {
  id: string;
  email: string;
  name: string | null;
};

/** User with active organization context for authorization. */
export type SaasContextUser = SaasUser & {
  orgId: string;
  orgRole: OrgRole;
  orgSlug: string;
  orgName: string;
  plan: SaasPlan;
  role: OrgRole;
};

export const ORG_COOKIE = "saas_org";

export const DEMO_ORG_ID = "org-demo";
export const DEMO_USER_ID = "user-demo";
export const DEMO_ADMIN_ID = "user-admin";

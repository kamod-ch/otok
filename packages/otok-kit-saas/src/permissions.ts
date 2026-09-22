export const SAAS_PERMISSIONS = {
  BILLING_READ: "saas:billing:read",
  SUBSCRIPTIONS_MANAGE: "saas:subscriptions:manage",
  BILLING_ADMIN: "saas:billing:admin",
} as const;

export type SaasPermission = (typeof SAAS_PERMISSIONS)[keyof typeof SAAS_PERMISSIONS];

export function hasSaasPermission(granted: readonly string[], required: SaasPermission): boolean {
  return granted.includes(required) || granted.includes("saas:*");
}

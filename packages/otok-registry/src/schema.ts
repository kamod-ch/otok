import { z } from "zod";

export const REGISTRY_SCHEMA_VERSION = "1.0.0";

export const PublisherSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  verified: z.boolean().default(false),
  url: z.string().url().optional(),
});

export const ExtensionTierSchema = z.enum(["official", "community"]);
export const MaintenanceStatusSchema = z.enum(["active", "maintenance", "deprecated", "abandoned"]);
export const QualityStatusSchema = z.enum(["verified", "unverified", "experimental"]);
export const RuntimeTargetSchema = z.enum(["node", "edge", "static"]);

export const ExtensionEntrySchema = z.object({
  name: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  description: z.string().min(1),
  publisher: z.string().min(1),
  tier: ExtensionTierSchema,
  version: z.string().min(1),
  otokVersion: z.string().min(1),
  runtime: z.array(RuntimeTargetSchema).min(1),
  adapters: z.array(z.enum(["node", "cloudflare", "static"])).default(["node"]),
  capabilities: z.array(z.string()).default([]),
  docs: z.string().url().optional(),
  repository: z.string().url().optional(),
  license: z.string().default("MIT"),
  maintenanceStatus: MaintenanceStatusSchema.default("active"),
  qualityStatus: QualityStatusSchema.default("unverified"),
  securityNotes: z.array(z.string()).default([]),
  deprecated: z.boolean().default(false),
  deprecationMessage: z.string().optional(),
  successor: z.string().optional(),
  publishedAt: z.string().datetime(),
  keywords: z.array(z.string()).default([]),
});

export const RegistryIndexSchema = z.object({
  schemaVersion: z.string(),
  generatedAt: z.string().datetime(),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  extensionsUrl: z.string(),
  publishers: z.array(PublisherSchema),
  reviewPolicyUrl: z.string().url().optional(),
  abuseContact: z.string().email().optional(),
});

export const RegistryBundleSchema = z.object({
  schemaVersion: z.string(),
  extensions: z.array(ExtensionEntrySchema),
});

export type Publisher = z.infer<typeof PublisherSchema>;
export type ExtensionEntry = z.infer<typeof ExtensionEntrySchema>;
export type RegistryIndex = z.infer<typeof RegistryIndexSchema>;
export type RegistryBundle = z.infer<typeof RegistryBundleSchema>;

export type LoadedRegistry = RegistryIndex & RegistryBundle & {
  publishersById: Map<string, Publisher>;
  extensionsByName: Map<string, ExtensionEntry>;
};

export interface RegistrySearchQuery {
  q?: string;
  tier?: ExtensionTier;
  runtime?: RuntimeTarget;
  capability?: string;
  deprecated?: boolean;
}

export type ExtensionTier = z.infer<typeof ExtensionTierSchema>;
export type RuntimeTarget = z.infer<typeof RuntimeTargetSchema>;

export interface CompatibilityResult {
  compatible: boolean;
  warnings: string[];
  errors: string[];
}

export interface RegistryClientOptions {
  cacheDir?: string;
  registryUrl?: string;
  cacheTtlMs?: number;
  offline?: boolean;
}

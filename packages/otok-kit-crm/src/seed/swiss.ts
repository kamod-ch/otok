import type {
  Activity,
  Company,
  Contact,
  Organization,
  Pipeline,
  Role,
  Tag,
  User,
} from "../schema/types.js";

const ORG_ID = "org-swiss-demo";
const now = "2026-08-03T08:00:00.000Z";

export const swissDemoOrganization: Organization = {
  id: ORG_ID,
  slug: "swiss-demo",
  name: "Alpine Sales GmbH",
  uid: "CHE-123.456.789",
  locale: "de",
  timezone: "Europe/Zurich",
  createdAt: now,
};

export const swissDemoRoles: Role[] = [
  { id: "role-admin", orgId: ORG_ID, name: "Administrator", permissions: ["crm:*"] },
  { id: "role-sales", orgId: ORG_ID, name: "Sales", permissions: ["crm:companies:read", "crm:companies:write", "crm:contacts:read", "crm:activities:write", "crm:search"] },
];

export const swissDemoUsers: User[] = [
  { id: "user-admin", orgId: ORG_ID, email: "admin@alpine-sales.ch", name: "Claudia Meier", roleId: "role-admin", locale: "de", active: true },
  { id: "user-sales", orgId: ORG_ID, email: "sales@alpine-sales.ch", name: "Marco Bianchi", roleId: "role-sales", locale: "it", active: true },
];

export const swissDemoPipeline: Pipeline = {
  id: "pipe-default",
  orgId: ORG_ID,
  name: "Standard B2B",
  stages: [
    { id: "stage-lead", name: "Lead", order: 1, probability: 10 },
    { id: "stage-qualified", name: "Qualifiziert", order: 2, probability: 30 },
    { id: "stage-proposal", name: "Offerte", order: 3, probability: 60 },
    { id: "stage-won", name: "Gewonnen", order: 4, probability: 100 },
  ],
};

export const swissDemoCompanies: Company[] = [
  {
    id: "co-migros",
    orgId: ORG_ID,
    name: "Migros-Genossenschafts-Bund",
    uid: "CHE-105.833.546",
    legalForm: "Genossenschaft",
    canton: "ZH",
    city: "Zürich",
    industry: "Retail",
    website: "https://www.migros.ch",
    pipelineId: "pipe-default",
    stageId: "stage-qualified",
    ownerId: "user-sales",
    tagIds: ["tag-enterprise"],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "co-buhler",
    orgId: ORG_ID,
    name: "Bühler AG",
    uid: "CHE-105.942.689",
    legalForm: "AG",
    canton: "ZH",
    city: "Uzwil",
    industry: "Machinery",
    website: "https://www.buhlergroup.com",
    pipelineId: "pipe-default",
    stageId: "stage-proposal",
    ownerId: "user-sales",
    tagIds: ["tag-industrial"],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "co-logitech",
    orgId: ORG_ID,
    name: "Logitech Europe S.A.",
    uid: "CHE-116.322.499",
    legalForm: "AG",
    canton: "VD",
    city: "Lausanne",
    industry: "Technology",
    website: "https://www.logitech.com",
    pipelineId: "pipe-default",
    stageId: "stage-lead",
    ownerId: "user-admin",
    tagIds: [],
    createdAt: now,
    updatedAt: now,
  },
];

export const swissDemoContacts: Contact[] = [
  { id: "ct-migros", orgId: ORG_ID, companyId: "co-migros", firstName: "Sandra", lastName: "Brunner", email: "sandra.brunner@migros.ch", title: "Einkaufsleiterin", language: "de" },
  { id: "ct-buhler", orgId: ORG_ID, companyId: "co-buhler", firstName: "Thomas", lastName: "Keller", email: "t.keller@buhlergroup.com", title: "Head of Procurement", language: "de" },
];

export const swissDemoActivities: Activity[] = [
  { id: "act-1", orgId: ORG_ID, companyId: "co-migros", contactId: "ct-migros", type: "meeting", subject: "Erstgespräch Nachhaltigkeit", occurredAt: "2026-08-01T10:00:00.000Z", userId: "user-sales" },
  { id: "act-2", orgId: ORG_ID, companyId: "co-buhler", type: "call", subject: "Follow-up Offerte", occurredAt: "2026-08-02T14:00:00.000Z", userId: "user-sales" },
];

export const swissDemoTags: Tag[] = [
  { id: "tag-enterprise", orgId: ORG_ID, name: "Enterprise", color: "#0ea5e9" },
  { id: "tag-industrial", orgId: ORG_ID, name: "Industrial", color: "#f59e0b" },
];

export const SWISS_DEMO_ORG_ID = ORG_ID;

export function createSwissDemoSeed() {
  return {
    organization: swissDemoOrganization,
    roles: swissDemoRoles,
    users: swissDemoUsers,
    pipelines: [swissDemoPipeline],
    companies: swissDemoCompanies,
    contacts: swissDemoContacts,
    activities: swissDemoActivities,
    tags: swissDemoTags,
  };
}

export function seedSwissDemo(service: { loadSeed: (data: ReturnType<typeof createSwissDemoSeed>) => void }) {
  service.loadSeed(createSwissDemoSeed());
}

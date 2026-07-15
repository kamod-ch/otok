export type FindingSeverity = "low" | "medium" | "high";

export interface Finding {
  id: string;
  severity: FindingSeverity;
  title: string;
  detail: string;
  file: string;
}

export interface Audit {
  id: string;
  repo: string;
  branch: string;
  status: "queued" | "reviewed";
  createdAt: string;
  summary: string;
  findings: Finding[];
}

const state = new Map<string, Audit>();

const seed: Audit[] = [
  {
    id: "otok-playground",
    repo: "https://github.com/kamod-ch/otok",
    branch: "main",
    status: "reviewed",
    createdAt: "2026-07-15T09:30:00.000Z",
    summary: "Production-readiness audit covering progressive forms, middleware, typed routes, and deployment hardening.",
    findings: [
      {
        id: "f-1",
        severity: "medium",
        title: "Document CSRF integration points",
        detail: "Actions intentionally stay validation-library agnostic. Cookie-authenticated apps should add CSRF middleware.",
        file: "src/app/routes/projects.tsx",
      },
      {
        id: "f-2",
        severity: "low",
        title: "Keep island payloads small",
        detail: "Large props are supported, but reference apps should prefer loader data IDs for very large records.",
        file: "src/app/islands/strategy-lab.tsx",
      },
    ],
  },
];

for (const audit of seed) state.set(audit.id, audit);

function slug(input: string) {
  const parsed = input.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  return parsed || `audit-${Date.now()}`;
}

function deterministicFindings(repo: string): Finding[] {
  const hasApi = /api|server|hono/i.test(repo);
  return [
    {
      id: "auth-boundary",
      severity: hasApi ? "high" : "medium",
      title: "Review authorization boundaries",
      detail: "Confirm route middleware protects every mutation and API endpoint that reads private data.",
      file: "src/server.ts",
    },
    {
      id: "form-validation",
      severity: "medium",
      title: "Return field-level validation errors",
      detail: "Use fail(400, { fieldErrors }) so no-JS and enhanced forms share the same validation model.",
      file: "src/app/routes/**/*.tsx",
    },
    {
      id: "asset-cache",
      severity: "low",
      title: "Verify immutable asset cache headers",
      detail: "Production static assets should be content-hashed and served with long-lived cache headers.",
      file: "src/server.ts",
    },
  ];
}

export const audits = {
  list() {
    return [...state.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  get(id: string) {
    return state.get(id);
  },
  create(input: { repo: string; branch: string }) {
    const id = slug(input.repo);
    const audit: Audit = {
      id,
      repo: input.repo,
      branch: input.branch || "main",
      status: "reviewed",
      createdAt: new Date().toISOString(),
      summary: `Automated review for ${input.repo}. Findings are deterministic demo output, not external AI calls.`,
      findings: deterministicFindings(input.repo),
    };
    state.set(id, audit);
    return audit;
  },
};

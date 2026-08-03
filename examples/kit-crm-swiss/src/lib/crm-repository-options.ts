import { indexCompany, getSearchIndex } from "@kamod-ch/otok-search";
import { enrichCompany, workflows } from "@kamod-ch/otok-workflows";
import type { KyselyCrmRepositoryOptions } from "@otok/kit-crm/db";

function domainFromWebsite(website: string | null | undefined): string | undefined {
  if (!website) return undefined;
  try {
    const host = new URL(website.startsWith("http") ? website : `https://${website}`).hostname;
    return host.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export async function triggerCompanyEnrichment(company: {
  id: string;
  name: string;
  website: string | null;
}) {
  const domain = domainFromWebsite(company.website);
  return workflows.start(
    enrichCompany,
    { companyId: company.id, name: company.name, domain },
    { idempotencyKey: `enrich:${company.id}` },
  );
}

export function createCrmRepositoryOptions(): KyselyCrmRepositoryOptions {
  return {
    onCompanyIndexed(orgId, company) {
      indexCompany(getSearchIndex(), orgId, company);
    },
    onCompanyImported(company) {
      void triggerCompanyEnrichment(company);
    },
  };
}

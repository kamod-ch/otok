/** LINDAS / Zefix company record (simplified). */
export interface ZefixRecord {
  id: string;
  name: string;
  legalForm?: string;
  uid?: string;
  street?: string;
  postalCode?: string;
  municipality?: string;
  source?: string;
}

/** Normalize Swiss UID to CHE-xxx.xxx.xxx display format. */
export function normalizeSwissUid(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 9) return raw;
  return `CHE-${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}`;
}

/** Compare UIDs ignoring punctuation. */
export function uidEquals(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return a.replace(/\D/g, "") === b.replace(/\D/g, "");
}

const LEGAL_FORM_URI: Record<string, string> = {
  "0101": "AG",
  "0103": "AG",
  "0104": "GmbH",
  "0107": "GmbH",
  "0109": "Genossenschaft",
  "0110": "Einzelfirma",
  "0113": "Kollektivgesellschaft",
};

/** Map Zefix legalForm URI to kit CRM enum value. */
export function parseZefixLegalForm(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  const code = uri.match(/(\d{4})$/)?.[1];
  if (code && LEGAL_FORM_URI[code]) return LEGAL_FORM_URI[code];
  return undefined;
}

/** Extract municipality code from LINDAS municipality URI. */
export function parseMunicipalityUri(uri: string | undefined): { municipalityCode?: string } {
  if (!uri) return {};
  const code = uri.match(/municipality\/(\d+)/)?.[1];
  return { municipalityCode: code };
}

export interface ZefixImportRow extends ZefixRecord {
  row: number;
}

export function parseZefixJson(input: string): ZefixImportRow[] {
  const parsed = JSON.parse(input) as unknown;
  const items = Array.isArray(parsed) ? parsed : [parsed];
  return items.map((item, index) => ({
    row: index + 1,
    id: String((item as ZefixRecord).id ?? ""),
    name: String((item as ZefixRecord).name ?? ""),
    legalForm: (item as ZefixRecord).legalForm,
    uid: (item as ZefixRecord).uid,
    street: (item as ZefixRecord).street,
    postalCode: (item as ZefixRecord).postalCode,
    municipality: (item as ZefixRecord).municipality,
    source: (item as ZefixRecord).source ?? "zefix",
  }));
}

export interface ZefixImportResult {
  imported: number;
  skipped: number;
  duplicates: string[];
  errors: { row: number; message: string }[];
}

export interface ZefixCompanyInput {
  orgId: string;
  externalId: string;
  name: string;
  uid?: string;
  legalForm?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  municipalityCode?: string;
  source: string;
  ownerId?: string;
}

/** Map Zefix record to CRM company fields with UID normalization. */
export function zefixToCompanyInput(
  record: ZefixRecord,
  orgId: string,
  ownerId?: string,
): ZefixCompanyInput {
  const municipality = parseMunicipalityUri(record.municipality);
  return {
    orgId,
    externalId: record.id,
    name: record.name.trim(),
    uid: normalizeSwissUid(record.uid),
    legalForm: parseZefixLegalForm(record.legalForm),
    street: record.street,
    postalCode: record.postalCode,
    municipalityCode: municipality.municipalityCode,
    source: record.source ?? "lindas-zefix",
    ownerId,
  };
}

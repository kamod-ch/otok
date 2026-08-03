import type { CrmLocale } from "../schema/types.js";

export type MessageKey =
  | "crm.title"
  | "crm.companies"
  | "crm.contacts"
  | "crm.activities"
  | "crm.tasks"
  | "crm.pipelines"
  | "crm.import"
  | "crm.export"
  | "crm.search.placeholder"
  | "crm.company.uid"
  | "crm.company.canton"
  | "crm.savedFilters";

const messages: Record<CrmLocale, Record<MessageKey, string>> = {
  de: {
    "crm.title": "CRM",
    "crm.companies": "Unternehmen",
    "crm.contacts": "Kontakte",
    "crm.activities": "Aktivitäten",
    "crm.tasks": "Aufgaben",
    "crm.pipelines": "Pipelines",
    "crm.import": "CSV importieren",
    "crm.export": "Exportieren",
    "crm.search.placeholder": "Firma, UID oder Branche suchen…",
    "crm.company.uid": "UID",
    "crm.company.canton": "Kanton",
    "crm.savedFilters": "Gespeicherte Filter",
  },
  fr: {
    "crm.title": "CRM",
    "crm.companies": "Entreprises",
    "crm.contacts": "Contacts",
    "crm.activities": "Activités",
    "crm.tasks": "Tâches",
    "crm.pipelines": "Pipelines",
    "crm.import": "Importer CSV",
    "crm.export": "Exporter",
    "crm.search.placeholder": "Rechercher entreprise, UID ou secteur…",
    "crm.company.uid": "UID",
    "crm.company.canton": "Canton",
    "crm.savedFilters": "Filtres enregistrés",
  },
  en: {
    "crm.title": "CRM",
    "crm.companies": "Companies",
    "crm.contacts": "Contacts",
    "crm.activities": "Activities",
    "crm.tasks": "Tasks",
    "crm.pipelines": "Pipelines",
    "crm.import": "Import CSV",
    "crm.export": "Export",
    "crm.search.placeholder": "Search company, UID or industry…",
    "crm.company.uid": "UID",
    "crm.company.canton": "Canton",
    "crm.savedFilters": "Saved filters",
  },
  it: {
    "crm.title": "CRM",
    "crm.companies": "Aziende",
    "crm.contacts": "Contatti",
    "crm.activities": "Attività",
    "crm.tasks": "Compiti",
    "crm.pipelines": "Pipeline",
    "crm.import": "Importa CSV",
    "crm.export": "Esporta",
    "crm.search.placeholder": "Cerca azienda, UID o settore…",
    "crm.company.uid": "UID",
    "crm.company.canton": "Cantone",
    "crm.savedFilters": "Filtri salvati",
  },
};

export function t(locale: CrmLocale, key: MessageKey): string {
  return messages[locale]?.[key] ?? messages.en[key] ?? key;
}

export { messages as crmMessages };

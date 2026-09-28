import type { DiscussionsI18n } from "./create.js";

export interface ModerationUiLabels {
  queueTitle: string;
  detailTitle: string;
  tenant: string;
  tableComment: string;
  tableKind: string;
  tableAuthor: string;
  tableReports: string;
  tableAge: string;
  nextPage: string;
  reportsHeading: string;
  auditHeading: string;
  formAction: string;
  formReason: string;
  formNote: string;
  apply: string;
  status: string;
}

export function moderationLabelsFromI18n(i18n: DiscussionsI18n): ModerationUiLabels {
  const t = i18n.t.bind(i18n);
  return {
    queueTitle: t("moderation.queueTitle"),
    detailTitle: t("moderation.detailTitle"),
    tenant: t("moderation.tenant"),
    tableComment: t("moderation.tableComment"),
    tableKind: t("moderation.tableKind"),
    tableAuthor: t("moderation.tableAuthor"),
    tableReports: t("moderation.tableReports"),
    tableAge: t("moderation.tableAge"),
    nextPage: t("moderation.nextPage"),
    reportsHeading: t("moderation.reportsHeading"),
    auditHeading: t("moderation.auditHeading"),
    formAction: t("moderation.formAction"),
    formReason: t("moderation.formReason"),
    formNote: t("moderation.formNote"),
    apply: t("moderation.apply"),
    status: t("moderation.status"),
  };
}

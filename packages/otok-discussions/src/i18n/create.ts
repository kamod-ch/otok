import { createI18n, type I18n, type MessageKey } from "@kamod-ch/i18n";
import { discussionMessagesDe } from "./messages/de.js";
import { discussionMessagesEn } from "./messages/en.js";
import type { DiscussionMessageSchema } from "./schema.js";

export const DISCUSSION_LOCALES = ["de", "en"] as const;
export type DiscussionLocale = (typeof DISCUSSION_LOCALES)[number];

export type DiscussionsI18n = I18n<DiscussionMessageSchema, DiscussionLocale>;

export interface CreateDiscussionsI18nOptions {
  locale: DiscussionLocale;
  fallbackLocale?: DiscussionLocale;
  onMissingKey?: (info: { locale: string; key: string }) => void;
}

/** One isolated instance per SSR request — do not share across requests. */
export function createDiscussionsI18n(options: CreateDiscussionsI18nOptions): DiscussionsI18n {
  const fallbackLocale = options.fallbackLocale ?? "en";
  return createI18n({
    locale: options.locale,
    fallbackLocale,
    messages: {
      de: discussionMessagesDe,
      en: discussionMessagesEn,
    },
    onMissingKey: options.onMissingKey,
  }) as DiscussionsI18n;
}

export function pickDiscussionLocale(
  acceptLanguage: string | null | undefined,
  defaultLocale: DiscussionLocale = "de",
): DiscussionLocale {
  if (!acceptLanguage) return defaultLocale;
  const lower = acceptLanguage.toLowerCase();
  if (/\bde\b/.test(lower) || lower.startsWith("de")) return "de";
  if (/\ben\b/.test(lower) || lower.startsWith("en")) return "en";
  return defaultLocale;
}

export type DiscussionMessageKey = MessageKey<DiscussionMessageSchema>;

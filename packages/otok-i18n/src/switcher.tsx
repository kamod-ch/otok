import { useI18n } from "./client.js";
import { switchLocalePath } from "./routes.js";

export interface LocaleSwitcherProps {
  locales: readonly string[];
  currentPath: string;
  labels?: Record<string, string>;
  className?: string;
}

/**
 * Locale switcher that preserves the current route.
 * Uses plain anchors for progressive enhancement and soft-nav compatibility.
 */
export function LocaleSwitcher({ locales, currentPath, labels = {}, className }: LocaleSwitcherProps) {
  const { locale: activeLocale, defaultLocale, routing } = useI18n();

  return (
    <nav aria-label="Language" className={className} data-otok-locale-switcher="">
      <ul style={{ display: "flex", gap: "0.5rem", listStyle: "none", padding: 0, margin: 0 }}>
        {locales.map((locale) => {
          const href = switchLocalePath(currentPath, locale, locales, { defaultLocale, routing });
          const label = labels[locale] ?? locale.toUpperCase();
          const isActive = locale === activeLocale;

          return (
            <li key={locale}>
              {isActive ? (
                <span aria-current="true" data-active-locale="">
                  {label}
                </span>
              ) : (
                <a href={href} hrefLang={locale} lang={locale} data-locale={locale}>
                  {label}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

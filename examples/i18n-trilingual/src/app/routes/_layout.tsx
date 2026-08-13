import type { OtokLayoutProps } from "@kamod-ch/otok/server";
import { I18nProvider } from "@kamod-ch/otok-i18n/client";
import { LocaleSwitcher } from "@kamod-ch/otok-i18n/switcher";
import { localizePath } from "@kamod-ch/otok-i18n/routes";
import type { I18nClientPayload } from "@kamod-ch/otok-i18n";

const LOCALES = ["de", "en", "fr"] as const;
const LABELS = { de: "DE", en: "EN", fr: "FR" };

type LayoutData = {
  i18n?: I18nClientPayload;
  pathname?: string;
};

export default function RootLayout({ children, data }: OtokLayoutProps<LayoutData>) {
  const i18n = data?.i18n;
  const currentPath = data?.pathname ?? "/";

  if (!i18n) {
    return <>{children}</>;
  }

  return (
    <I18nProvider {...i18n}>
      <header>
        <nav>
          <a href={localizePath("/", i18n.locale, { defaultLocale: "de", routing: i18n.routing })}>
            {i18n.messages["nav.home"] ?? "Home"}
          </a>
          <a href={localizePath("/products", i18n.locale, { defaultLocale: "de", routing: i18n.routing })}>
            {i18n.messages["nav.products"] ?? "Products"}
          </a>
        </nav>
        <LocaleSwitcher locales={LOCALES} currentPath={currentPath} labels={LABELS} />
      </header>
      {children}
    </I18nProvider>
  );
}

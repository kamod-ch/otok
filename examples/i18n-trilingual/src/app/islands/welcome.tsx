import { useI18n } from "@kamod-ch/otok-i18n/client";

export interface WelcomeProps {
  itemCount: number;
}

export function Welcome({ itemCount }: WelcomeProps) {
  const { t, locale, formatCurrency } = useI18n();

  return (
    <>
      <h1>{t("dashboard.welcome")}</h1>
      <p>{t("items", { count: itemCount })}</p>
      <p>{formatCurrency(29, "CHF")}</p>
      <p>
        <small>Locale: {locale}</small>
      </p>
    </>
  );
}

export default Welcome;

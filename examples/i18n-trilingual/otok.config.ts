import { defineConfig } from "otok";
import i18n from "@kamod-ch/otok-i18n";

export default defineConfig({
  plugins: [
    i18n({
      locales: ["de", "en", "fr"],
      defaultLocale: "de",
      routing: "prefix-except-default",
      fallbackLocale: "en",
      messages: {
        de: () => import("./src/locales/de.json"),
        en: () => import("./src/locales/en.json"),
        fr: () => import("./src/locales/fr.json"),
      },
    }),
  ],
});

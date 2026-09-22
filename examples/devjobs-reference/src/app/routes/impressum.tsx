import { AppShell } from "../components/app-shell.js";
import { defineLoader, serializeI18n } from "@kamod-ch/otok-i18n/loader";
import { defineMeta } from "@kamod-ch/otok-seo";
import { defineRendering } from "@kamod-ch/otok/rendering";
import { authFromOtokContext, tryGetAuthRuntime } from "@kamod-ch/otok-auth";
import type { OtokPageProps } from "@kamod-ch/otok/server";

/** Static legal page — no islands, minimal client JS. */
export const rendering = defineRendering({ mode: "ssr", cache: { public: true, maxAge: 3600 } });

export const loader = defineLoader(async ({ i18n, hono }) => {
  let user = null;
  const authRuntime = tryGetAuthRuntime();
  if (authRuntime) {
    user = await authFromOtokContext(hono, authRuntime.helpers).getSession();
  }
  return {
    title: i18n.t("impressum.title"),
    i18n: serializeI18n(hono),
    user,
  };
});

export const head = defineMeta(({ data }: { data: any }) => ({ title: data.title }));

export default function ImpressumPage({ data }: OtokPageProps<any>) {
  return (
    <AppShell title="Devjobs Reference" i18n={data.i18n} user={data.user}>
      <section class="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 class="text-2xl font-semibold">{data.title}</h1>
        <p class="mt-4 text-muted-foreground">
          Devjobs Reference — demo application for Otok integration tests. No production data.
        </p>
      </section>
    </AppShell>
  );
}

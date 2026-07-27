import { AppShell } from "../../components/app-shell.js";
import { Button } from "@kamod-ch/ui/button";
import { defineLoader as defineAuthLoader } from "@kamod-ch/otok-auth/loader";
import { readI18n } from "@kamod-ch/otok-i18n";
import { defineMeta } from "@kamod-ch/otok-seo";
import type { OtokPageProps } from "otok/server";
import type { SaasDatabase } from "../../db/types.js";

export const loader = defineAuthLoader(async ({ auth, hono }) => {
  const user = await auth.requireUser();
  const i18n = readI18n(hono);
  if (!i18n) throw new Error("i18n plugin required");

  const db = hono.get("db" as never) as import("kysely").Kysely<SaasDatabase> | undefined;
  if (!db) throw new Error("kysely plugin required");

  const projects = await db
    .selectFrom("projects")
    .selectAll()
    .where("userId", "=", user.id)
    .orderBy("updatedAt", "desc")
    .execute();

  return {
    user,
    projects,
    copy: {
      title: i18n.t("projects.title"),
      new: i18n.t("projects.new"),
      empty: i18n.t("projects.empty"),
    },
    i18n: i18n.toClientPayload(),
  };
});

export const head = defineMeta(({ data }) => ({
  title: data.copy.title,
  robots: "noindex",
}));

export default function ProjectsPage({ data }: OtokPageProps<typeof loader>) {
  return (
    <AppShell i18n={data.i18n} title={data.copy.title} user={data.user}>
      <section class="mx-auto max-w-4xl space-y-6 px-6 py-10">
        <div class="flex items-center justify-between gap-4">
          <h1 class="text-3xl font-semibold">{data.copy.title}</h1>
          <Button asChild>
            <a href="/projects/new">{data.copy.new}</a>
          </Button>
        </div>
        {data.projects.length === 0 ? (
          <p class="text-muted-foreground">{data.copy.empty}</p>
        ) : (
          <ul class="divide-y rounded-xl border bg-card">
            {data.projects.map((project) => (
              <li key={project.id} class="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <a href={`/projects/${project.id}`} class="font-medium hover:underline">
                    {project.title}
                  </a>
                  {project.description ? (
                    <p class="text-sm text-muted-foreground">{project.description}</p>
                  ) : null}
                </div>
                <a href={`/projects/${project.id}/edit`} class="text-sm text-muted-foreground hover:text-foreground">
                  Edit
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

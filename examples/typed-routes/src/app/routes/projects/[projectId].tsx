import { defineLoader, defineMeta } from "otok/route";

export const loader = defineLoader(async ({ params }) => ({
  project: { id: params.projectId, name: `Project ${params.projectId}` },
}));

export const head = defineMeta(({ data }) => ({
  title: data.project.name,
}));

export default function ProjectPage({ loaderData }: Route.ComponentProps) {
  return (
    <main>
      <h1>{loaderData.project.name}</h1>
    </main>
  );
}

import { defineLoader, defineMeta, type RouteComponentProps } from "otok/route";

export const loader = defineLoader(async ({ params }) => ({
  project: { id: params.projectId, name: `Project ${params.projectId}` },
}));

type LoaderData = Awaited<ReturnType<typeof loader>>;

export const head = defineMeta<LoaderData>(({ data }) => ({
  title: data.project.name,
}));

export default function ProjectPage({ loaderData }: RouteComponentProps<LoaderData>) {
  return (
    <main>
      <h1>{loaderData.project.name}</h1>
    </main>
  );
}

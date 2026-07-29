import { defineLoader, defineMeta } from "otok/route";
import { route } from "virtual:otok-routes";

export const loader = defineLoader(async () => ({
  projects: [
    { id: "alpha", name: "Alpha" },
    { id: "beta", name: "Beta" },
  ],
}));

export const head = defineMeta(({ data }) => ({
  title: "Projects",
}));

export default function ProjectsIndex({ loaderData }: Route.ComponentProps) {
  return (
    <main>
      <h1>Projects</h1>
      <ul>
        {loaderData.projects.map((project) => (
          <li key={project.id}>
            <a href={route("/projects/[projectId]", { params: { projectId: project.id } })}>{project.name}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}

import { defineLoader } from "@kamod-ch/otok-supabase/loader";
import type { Database } from "../../../database.types.js";

type DashboardData = {
  projects: Array<{ id: string; name: string }>;
  user: { email?: string } | null;
};

export const loader = defineLoader<DashboardData, Database>(async ({ supabase }) => {
  const { data: projects, error } = await supabase.from("projects").select("id,name").limit(10);
  if (error) throw error;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { projects: projects ?? [], user };
});

export default function Dashboard({ data }: { data: DashboardData }) {
  return (
    <main>
      <h1>Dashboard</h1>
      <p>Signed in as {data.user?.email ?? "unknown"}</p>
      <h2>Projects (RLS-protected)</h2>
      <ul>
        {data.projects.map((project) => (
          <li key={project.id}>{project.name}</li>
        ))}
      </ul>
      <form method="post" action="/auth/signout">
        <input type="hidden" name="_csrf" value="" data-otok-csrf />
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}

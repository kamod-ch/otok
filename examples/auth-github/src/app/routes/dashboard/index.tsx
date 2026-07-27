import { defineLoader } from "@kamod-ch/otok-auth/loader";

export const loader = defineLoader(async ({ auth }) => {
  const user = await auth.requireUser();
  return { user };
});

export default function Dashboard({ data }: { data: { user: { email: string; role: string } } }) {
  return (
    <main>
      <h1>Dashboard</h1>
      <p>
        {data.user.email} ({data.user.role})
      </p>
      <form method="post" action="/auth/logout">
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}

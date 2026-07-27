import { defineLoader } from "@kamod-ch/otok-auth/loader";

export const loader = defineLoader(async ({ auth }) => {
  const user = await auth.getSession();
  return { user };
});

export default function Home({ data }: { data: { user: { email: string } | null } }) {
  if (!data.user) {
    return (
      <main>
        <h1>Sign in</h1>
        <p>
          <a href="/auth/github?next=/dashboard">Continue with GitHub</a>
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>Signed in</h1>
      <p>{data.user.email}</p>
      <p>
        <a href="/dashboard">Dashboard</a>
      </p>
    </main>
  );
}

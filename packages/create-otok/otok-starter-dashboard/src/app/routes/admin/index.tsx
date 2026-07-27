import type { OtokContext, OtokPageProps } from "otok/server";

export const chrome = () => ({
  title: "Protected admin",
  description: "Route-level middleware demo.",
});

export const loader = ({ hono }: OtokContext) => ({
  user: String((hono as any).get("demoUser") ?? "unknown"),
});

export default function AdminPage({ data }: OtokPageProps<{ user: string }>) {
  return (
    <section class="space-y-4">
      <p class="text-sm font-medium text-sky-600 dark:text-sky-300">Route middleware</p>
      <h2 class="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Protected admin</h2>
      <p class="text-slate-600 dark:text-slate-300">Hello {data.user}. This page is guarded by admin/_middleware.ts.</p>
    </section>
  );
}

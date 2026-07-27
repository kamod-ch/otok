import { Island } from "otok/client";
import type { OtokPageProps } from "otok/server";
import Counter from "../islands/counter";

export const head = () => ({
  title: "Otok Cloudflare Worker",
  description: "SSR + islands on Cloudflare Workers",
});

export const loader = () => ({
  runtime: "cloudflare",
  message: "Rendered on the Edge with createOtokWorkerApp.",
});

export default function Home({ data }: OtokPageProps) {
  const page = data as { runtime: string; message: string };
  return (
    <section class="card">
      <p class="eyebrow">{page.runtime}</p>
      <h1>Cloudflare Workers + Otok</h1>
      <p>{page.message}</p>
      <Island component={Counter} props={{ initial: 0 }} strategy="idle" />
    </section>
  );
}

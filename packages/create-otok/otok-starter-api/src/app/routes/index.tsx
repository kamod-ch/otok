import { json } from "@kamod-ch/otok/server";

export const loader = () => ({
  service: "otok-api-starter",
  version: "1.0.0",
});

export default function ApiHome() {
  return (
    <main class="mx-auto max-w-xl space-y-4 p-8 font-mono text-sm">
      <h1 class="text-xl font-semibold">Otok API starter</h1>
      <p>JSON endpoints live under <code>/api/*</code>. This page is optional documentation UI.</p>
      <ul class="list-disc pl-5">
        <li>
          <a href="/api/health">GET /api/health</a>
        </li>
        <li>
          <a href="/api/items">GET /api/items</a>
        </li>
      </ul>
    </main>
  );
}

export async function action() {
  return json({ ok: false, message: "Use /api routes for mutations." }, 405);
}

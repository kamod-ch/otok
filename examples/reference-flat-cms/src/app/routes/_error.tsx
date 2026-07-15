import type { OtokErrorProps } from "otok/server";

export default function ErrorRoute({ error, status }: OtokErrorProps) {
  return (
    <section class="card error">
      <p class="eyebrow">Error {status}</p>
      <h1>{error.message}</h1>
      <p>The CMS keeps unexpected server details hidden by default.</p>
    </section>
  );
}

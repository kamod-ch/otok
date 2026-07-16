export default function ErrorRoute({ data }: { data: { message?: string; status?: number } }) {
  return (
    <section class="card error">
      <p class="eyebrow">Error {data.status ?? 500}</p>
      <h1>{data.message ?? "Something went wrong"}</h1>
      <p>The CMS keeps unexpected server details hidden by default.</p>
    </section>
  );
}

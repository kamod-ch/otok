export const head = () => ({ title: "About | Otok Cloudflare" });

export default function About() {
  return (
    <section class="card">
      <p class="eyebrow">Zero JS by default</p>
      <h1>About this example</h1>
      <p>
        This page has no islands. Client JavaScript is omitted. Hashed assets for other routes still
        come from Workers Assets.
      </p>
    </section>
  );
}

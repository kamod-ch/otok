export function meta() {
  return {
    title: "PreactPress on Otok",
    httpEquiv: [{ name: "refresh", content: "0; url=/docs/index" }],
  };
}

export default function HomeRedirect() {
  return (
    <main style="padding: 2rem; font-family: system-ui, sans-serif;">
      <p>
        Redirecting to <a href="/docs/index">documentation</a>…
      </p>
    </main>
  );
}

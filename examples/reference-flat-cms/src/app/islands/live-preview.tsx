import { useState } from "preact/hooks";

export default function LivePreview({ initialTitle, initialBody }: { initialTitle: string; initialBody: string }) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);

  return (
    <section class="preview card">
      <h2>Live preview island</h2>
      <label>
        Preview title
        <input value={title} onInput={(event) => setTitle(event.currentTarget.value)} />
      </label>
      <label>
        Preview body
        <textarea value={body} onInput={(event) => setBody(event.currentTarget.value)} rows={5} />
      </label>
      <article class="rendered-preview">
        <h3>{title || "Untitled"}</h3>
        <p>{body || "Start typing to preview content."}</p>
      </article>
    </section>
  );
}

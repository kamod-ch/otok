import { useEffect, useRef } from "preact/hooks";

/** Small island: mirrors title field length for progressive enhancement demos. */
export function JobTitlePreview({ initialTitle }: { initialTitle: string }) {
  const outputRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>("form[data-job-form]");
    const titleInput = form?.querySelector<HTMLInputElement>('input[name="title"]');
    if (!titleInput || !outputRef.current) return;

    const sync = () => {
      if (outputRef.current) {
        outputRef.current.textContent = `${titleInput.value.length} characters (live)`;
      }
    };
    sync();
    titleInput.addEventListener("input", sync);
    return () => titleInput.removeEventListener("input", sync);
  }, []);

  return (
    <p ref={outputRef} class="text-sm text-muted-foreground" data-island="job-title-preview" aria-live="polite">
      {initialTitle.length} characters (live)
    </p>
  );
}

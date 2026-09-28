import { useEffect, useRef } from "preact/hooks";

export interface CommentComposerLiveRegionProps {
  textareaId?: string;
  template?: string;
}

/**
 * Optional island: mirrors composer length for progressive enhancement.
 * Register via `@kamod-ch/otok/client` `<Island>` only when live feedback is desired.
 */
export default function CommentComposerLiveRegion({
  textareaId = "discussion-composer-body",
  template = "{count} Zeichen",
}: CommentComposerLiveRegionProps) {
  const outputRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const textarea = document.getElementById(textareaId);
    if (!(textarea instanceof HTMLTextAreaElement) || !outputRef.current) return;

    const sync = () => {
      if (outputRef.current) {
        outputRef.current.textContent = template.replace("{count}", String(textarea.value.length));
      }
    };
    sync();
    textarea.addEventListener("input", sync);
    return () => textarea.removeEventListener("input", sync);
  }, [textareaId, template]);

  return (
    <p
      ref={outputRef}
      class="text-xs text-muted-foreground motion-reduce:transition-none"
      aria-live="polite"
      data-otok-discussion-composer-live=""
    />
  );
}

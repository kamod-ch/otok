import { useEffect } from "preact/hooks";

declare global {
  interface Window {
    __otokCleanupCalls?: number;
    __otokProbeLive?: boolean;
  }
}

/** E2E probe: increments window.__otokCleanupCalls exactly once on unmount. */
export default function CleanupProbe() {
  useEffect(() => {
    window.__otokProbeLive = true;
    const intervalId = globalThis.setInterval(() => {}, 10_000);
    const onResize = () => {};
    globalThis.addEventListener("resize", onResize);

    return () => {
      window.__otokProbeLive = false;
      globalThis.clearInterval(intervalId);
      globalThis.removeEventListener("resize", onResize);
      window.__otokCleanupCalls = (window.__otokCleanupCalls ?? 0) + 1;
    };
  }, []);

  return (
    <p data-testid="cleanup-probe" class="text-sm text-slate-600 dark:text-slate-300">
      Cleanup probe mounted
    </p>
  );
}

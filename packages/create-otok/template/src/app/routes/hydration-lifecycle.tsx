import { Island } from "@kamod-ch/otok/client";
import CleanupProbe from "../islands/cleanup-probe";

export const head = () => ({
  title: "Hydration lifecycle | Otok Playground",
  description: "Island unmount and deferred hydration coverage.",
});

export const chrome = () => ({
  title: "Hydration lifecycle",
  description: "Cleanup on navigation away.",
});

export default function HydrationLifecyclePage() {
  return (
    <section class="space-y-6">
      <p class="text-sm text-slate-600 dark:text-slate-300">
        The probe below registers interval and window listeners; leaving this route should run Preact cleanup once.
      </p>
      <Island component={CleanupProbe} strategy="load" />
    </section>
  );
}

import { useEffect, useState } from "preact/hooks";
import { useFetcher, LoadingBoundary } from "otok/client";
import { Input } from "@kamod-ch/ui/input";
import { Button } from "@kamod-ch/ui/button";
import type { Activity } from "../data/crm";

export interface ActivityPanelProps {
  companyId: string;
  activities: Activity[];
}

export default function ActivityPanel({ companyId, activities: initial }: ActivityPanelProps) {
  const [activities, setActivities] = useState(initial);
  const fetcher = useFetcher<{ ok: boolean; activity: Activity }>(`/crm/companies/${companyId}`);

  useEffect(() => {
    if (fetcher.data?.ok && fetcher.data.activity) {
      setActivities((prev) =>
        prev.some((a) => a.id === fetcher.data!.activity.id) ? prev : [fetcher.data!.activity, ...prev],
      );
    }
  }, [fetcher.data]);

  return (
    <div class="space-y-4">
      <h3 class="text-lg font-semibold text-slate-950 dark:text-white">Activities</h3>

      <LoadingBoundary state={fetcher.state}>
        <form method="post" {...fetcher.formProps} class="flex max-w-lg gap-2">
          <input type="hidden" name="intent" value="add-activity" />
          <input type="hidden" name="companyId" value={companyId} />
          <Input name="note" placeholder="Log an activity…" class="flex-1" aria-label="Activity note" />
          <Button type="submit" disabled={fetcher.state !== "idle"} aria-busy={fetcher.state !== "idle"}>
            Add
          </Button>
        </form>
      </LoadingBoundary>

      {fetcher.error ? (
        <p role="alert" class="text-sm text-red-600">
          {fetcher.error instanceof Error ? fetcher.error.message : "Failed to add activity"}
        </p>
      ) : null}

      <ul class="space-y-2" aria-label="Activity feed">
        {activities.map((activity) => (
          <li key={activity.id} class="rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
            <p>{activity.note}</p>
            <time class="text-xs text-slate-500" dateTime={activity.createdAt}>
              {new Date(activity.createdAt).toLocaleString()}
            </time>
          </li>
        ))}
      </ul>
    </div>
  );
}

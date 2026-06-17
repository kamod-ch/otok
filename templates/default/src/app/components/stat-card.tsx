import { Card, CardContent, CardHeader, CardTitle } from "@kamod-ui/core";
import type { ComponentChildren } from "preact";

type StatCardProps = {
  title: string;
  value: ComponentChildren;
  change?: string;
};

export function StatCard({ title, value, change }: StatCardProps) {
  return (
    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">{value}</div>
        {change ? <p class="text-xs text-muted-foreground">{change}</p> : null}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@kamod-ui/core";

export const head = () => ({
  title: "Error | Otok Playground",
});

export default function ErrorRoute({ data }: { data: { message?: string; status?: number } }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Something went wrong</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3 text-sm text-muted-foreground">
        <p>Status: {data.status ?? 500}</p>
        <p>{data.message ?? "The error route handled this failure."}</p>
      </CardContent>
    </Card>
  );
}

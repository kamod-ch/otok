import { Badge, Card, CardContent, CardHeader, CardTitle } from "@kamod-ui/core";
import type { OtokContext } from "otok/server";

export const loader = ({ params }: OtokContext) => ({
  slug: params.slug,
  segments: params.slug.split("/"),
});

export const head = ({ data }: { data: { slug: string } }) => ({
  title: `Docs ${data.slug} | Otok Playground`,
});

export const chrome = () => ({
  title: "Catch-all route",
  description: "A catch-all route powered by Otok file routing.",
});

export default function DocsPage({ data }: { data: { slug: string; segments: string[] } }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Catch-all docs route</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <Badge>/docs/[...slug]</Badge>
        <p class="text-muted-foreground">Loaded docs slug: {data.slug}</p>
        <div class="flex flex-wrap gap-2">
          {data.segments.map((segment) => (
            <Badge key={segment} variant="secondary">
              {segment}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

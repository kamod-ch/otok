import { Badge, Card, CardContent, CardHeader, CardTitle } from "@kamod-ui/core";

export const head = () => ({
  title: "About | Otok Playground",
  description: "A static Otok route that ships no client JavaScript.",
});

export default function About() {
  return (
    <>
      <section class="space-y-4">
        <Badge variant="secondary">Zero JS</Badge>
        <p class="max-w-2xl text-muted-foreground">
          Otok renders this page on the server and omits the client entry script because there is
          nothing to hydrate.
        </p>
      </section>
      <Card class="mt-6">
        <CardHeader>
          <CardTitle>What still works?</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2 text-sm text-muted-foreground">
          <p>Semantic HTML, Tailwind classes, and presentational kamod-ui components.</p>
          <p>Client state, event handlers, and portals belong in islands.</p>
        </CardContent>
      </Card>
    </>
  );
}

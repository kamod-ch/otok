import { Badge, Card, CardContent, CardHeader, CardTitle } from "@kamod-ui/core";

export const head = () => ({
  title: "About Otok",
  description: "A static Otok route that ships no client JavaScript.",
});

export default function About() {
  return (
    <main class="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-16">
      <a class="text-sm text-muted-foreground underline" href="/">
        Back home
      </a>
      <section class="space-y-4">
        <Badge variant="secondary">Zero JS</Badge>
        <h1 class="text-4xl font-semibold tracking-tight">This route has no islands.</h1>
        <p class="text-muted-foreground">
          Otok renders this page on the server and omits the client entry script because there is
          nothing to hydrate.
        </p>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>What still works?</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2 text-sm text-muted-foreground">
          <p>Semantic HTML, Tailwind classes, and presentational kamod-ui components.</p>
          <p>Client state, event handlers, and portals belong in islands.</p>
        </CardContent>
      </Card>
    </main>
  );
}

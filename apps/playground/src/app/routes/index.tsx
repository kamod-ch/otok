import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@kamod-ui/core";
import { Island } from "otok/client";
import Counter from "../islands/counter";

export const loader = async () => ({
  initialCount: 5,
});

export const head = () => ({
  title: "Otok",
  description: "Hono + Preact Islands + kamod-ui.",
});

export default function Home({ data }: { data: { initialCount: number } }) {
  return (
    <main class="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-16">
      <section class="space-y-5">
        <Badge>Otok</Badge>
        <div class="space-y-3">
          <h1 class="text-4xl font-semibold tracking-tight sm:text-6xl">
            Hono SSR with Preact islands.
          </h1>
          <p class="max-w-2xl text-lg text-muted-foreground">
            Routes render to static HTML. Only islands ship JavaScript and hydrate on the client.
          </p>
        </div>
        <nav class="flex flex-wrap gap-3">
          <Button href="/about">Zero-JS route</Button>
          <Button href="/demo" variant="secondary">
            kamod-ui islands
          </Button>
        </nav>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Counter island</CardTitle>
        </CardHeader>
        <CardContent>
          <Island component={Counter} props={{ init: data.initialCount }} />
        </CardContent>
      </Card>
    </main>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kamod-ui/core";
import { defineRendering, createDeferredSlot, DeferredBoundary } from "otok/rendering";

export const rendering = defineRendering({
  mode: "ssr",
  streaming: true,
  deferred: true,
  cache: false,
});

function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function loader() {
  const startedAt = Date.now();
  return {
    startedAt,
    user: { name: "Ada" },
    feed: createDeferredSlot("feed", () =>
      delay(1000, [
        { id: "1", title: "Deferred post one" },
        { id: "2", title: "Deferred post two" },
      ]),
    ),
  };
}

export const head = () => ({
  title: "Deferred streaming | Otok Playground",
  description: "Shell and critical HTML stream before slow loader regions resolve.",
});

export const chrome = () => ({
  title: "Deferred streaming",
  description: "TTFB should arrive before the 1s feed slot finishes.",
});

type PageData = Awaited<ReturnType<typeof loader>>;

export default function DeferredDemo({ data }: { data: PageData }) {
  return (
    <div class="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Critical content</CardTitle>
          <CardDescription>
            This card is part of the first body chunk. Hello {data.user.name} — request started at{" "}
            {new Date(data.startedAt).toISOString()}.
          </CardDescription>
        </CardHeader>
        <CardContent class="text-sm text-muted-foreground">
          View source / network waterfall: the HTML shell and this section should arrive before the feed
          below (~1s artificial delay). No client JavaScript is required for the deferred region to appear.
        </CardContent>
      </Card>

      <DeferredBoundary
        slot={data.feed}
        fallback={<p class="text-sm text-muted-foreground">Loading feed…</p>}
      >
        {(posts) => (
          <Card>
            <CardHeader>
              <CardTitle>Deferred feed</CardTitle>
              <CardDescription>Streamed after the slot promise resolved.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul class="list-disc space-y-1 pl-5 text-sm">
                {posts.map((post) => (
                  <li key={post.id}>{post.title}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </DeferredBoundary>
    </div>
  );
}

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@kamod-ui/core";
import type { OtokContext } from "otok/server";

export const loader = async ({ params }: OtokContext) => ({
  userId: params.id,
});

export const head = ({ data }: { data: { userId: string } }) => ({
  title: `User ${data.userId}`,
});

export default function UserPage({ data }: { data: { userId: string } }) {
  return (
    <main class="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <a class="text-sm text-muted-foreground underline" href="/">
        Back home
      </a>
      <Card>
        <CardHeader>
          <CardTitle>Dynamic route</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <Badge>/users/[id]</Badge>
          <p class="text-muted-foreground">Loaded user id: {data.userId}</p>
        </CardContent>
      </Card>
    </main>
  );
}

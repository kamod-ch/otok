import { Badge, Card, CardContent, CardHeader, CardTitle } from "@kamod-ui/core";
import type { OtokContext } from "otok/server";

export const loader = async ({ params }: OtokContext) => ({
  userId: params.id,
});

export const head = ({ data }: { data: { userId: string } }) => ({
  title: `User ${data.userId} | Otok Playground`,
});

export const chrome = ({ params }: { params: { id: string } }) => ({
  title: "Dynamic route",
  description: `Server-rendered route for ${params.id}.`,
});

export default function UserPage({
  data,
}: {
  data: { userId: string };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>/users/[id]</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <Badge>/users/[id]</Badge>
        <p class="text-muted-foreground">Loaded user id: {data.userId}</p>
      </CardContent>
    </Card>
  );
}

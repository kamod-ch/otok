import { Button, Card, CardContent, CardHeader, CardTitle } from "@kamod-ui/core";

export const head = () => ({
  title: "Not found | Otok Playground",
});

export default function NotFound() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Page not found</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <p class="text-muted-foreground">Otok rendered this 404 through the route convention.</p>
        <Button href="/" variant="outline" size="sm">
          Back to dashboard
        </Button>
      </CardContent>
    </Card>
  );
}

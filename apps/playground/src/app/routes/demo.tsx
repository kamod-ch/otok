import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kamod-ui/core";
import { Island } from "otok/client";
import DemoDialog from "../islands/demo-dialog";
import ThemeIsland from "../islands/theme-island";

export const head = () => ({
  title: "Otok kamod-ui demo",
  description: "Interactive kamod-ui components hydrated as islands.",
});

export default function Demo() {
  return (
    <main class="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-16">
      <a class="text-sm text-muted-foreground underline" href="/">
        Back home
      </a>
      <section class="space-y-3">
        <h1 class="text-4xl font-semibold tracking-tight">kamod-ui islands</h1>
        <p class="text-muted-foreground">
          Dialog and theme interactions are isolated islands. The surrounding page remains static.
        </p>
      </section>

      <div class="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dialog</CardTitle>
            <CardDescription>Hydrated only inside this card.</CardDescription>
          </CardHeader>
          <CardContent>
            <Island component={DemoDialog} props={{ label: "Open dialog" }} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>Theme state stays client-side.</CardDescription>
          </CardHeader>
          <CardContent>
            <Island component={ThemeIsland} props={{}} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

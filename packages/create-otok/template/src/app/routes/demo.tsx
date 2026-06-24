import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kamod-ui/core";
import { Island } from "otok/client";
import DemoDialog from "../islands/demo-dialog";
import DashboardToolbar from "../islands/dashboard-toolbar";
import ThemeIsland from "../islands/theme-island";

export const head = () => ({
  title: "kamod-ui islands | Otok Playground",
  description: "Interactive kamod-ui components hydrated as islands.",
});

export const chrome = () => ({
  title: "kamod-ui islands",
  description: "Dialog and theme interactions are isolated islands.",
  toolbar: <Island component={DashboardToolbar} props={{}} strategy="load" />,
});

export default function Demo() {
  return (
    <div class="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Dialog</CardTitle>
          <CardDescription>Hydrated only inside this card.</CardDescription>
        </CardHeader>
        <CardContent>
          <Island component={DemoDialog} props={{ label: "Open dialog" }} strategy="idle" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Theme state stays client-side.</CardDescription>
        </CardHeader>
        <CardContent>
          <Island component={ThemeIsland} props={{}} strategy="idle" />
        </CardContent>
      </Card>
    </div>
  );
}

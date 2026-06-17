import { Island } from "otok/client";
import type { OtokLayoutProps } from "otok/server";
import { DashboardShell } from "../components/dashboard-shell";
import DashboardToolbar from "../islands/dashboard-toolbar";

function routeChrome({ route, params, data }: Pick<OtokLayoutProps, "route" | "params" | "data">) {
  if (route === "/") {
    const dateRange =
      data && typeof data === "object" && "dateRange" in data
        ? (data.dateRange as { from?: string; to?: string })
        : undefined;
    return {
      title: "Dashboard",
      description:
        dateRange?.from && dateRange.to ? `${dateRange.from} - ${dateRange.to}` : "Otok dashboard",
      toolbar: <Island component={DashboardToolbar} props={{}} strategy="load" />,
    };
  }

  if (route === "/demo") {
    return {
      title: "kamod-ui islands",
      description: "Dialog and theme interactions are isolated islands.",
      toolbar: <Island component={DashboardToolbar} props={{}} strategy="load" />,
    };
  }

  if (route === "/users/:id") {
    return {
      title: "Dynamic route",
      description: `Server-rendered route for ${params.id}.`,
    };
  }

  if (route === "/docs/:slug*") {
    return {
      title: "Catch-all route",
      description: "A catch-all route powered by Otok file routing.",
    };
  }

  return {
    title: "Zero-JS route",
    description: "This route has no islands.",
  };
}

export default function Layout({ children, data, params, route }: OtokLayoutProps) {
  const chrome = routeChrome({ route, params, data });

  return (
    <DashboardShell route={route} title={chrome.title} description={chrome.description} toolbar={chrome.toolbar}>
      {children}
    </DashboardShell>
  );
}

import type { OtokChrome, OtokLayoutProps } from "otok/server";
import { DashboardShell } from "../components/dashboard-shell";

const defaultChrome: OtokChrome = {
  title: "Otok Playground",
  description: "Server-rendered Preact with islands.",
};

export default function Layout({ children, chrome, route }: OtokLayoutProps) {
  const resolved = chrome ?? defaultChrome;

  return (
    <DashboardShell
      route={route}
      title={resolved.title ?? "Otok Playground"}
      description={resolved.description ?? defaultChrome.description}
      toolbar={resolved.toolbar}
    >
      {children}
    </DashboardShell>
  );
}

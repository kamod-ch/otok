import {
  Avatar,
  AvatarFallback,
  Button,
  Separator,
} from "@kamod-ui/core";
import type { ComponentChildren } from "preact";
import { dashboardNavGroups, isNavItemActive } from "./dashboard-nav";
import { dashboardUser } from "../data/dashboard";

type DashboardShellProps = {
  route: string;
  title: string;
  description?: string;
  toolbar?: ComponentChildren;
  children: ComponentChildren;
};

function SidebarNav({ route }: { route: string }) {
  return (
    <nav class="flex flex-col gap-4 px-2 py-4">
      {dashboardNavGroups.map((group) => (
        <details key={group.label} open class="group">
          <summary class="cursor-pointer list-none px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground [&::-webkit-details-marker]:hidden">
            {group.label}
          </summary>
          <ul class="mt-2 flex flex-col gap-1">
            {group.items.map((item) => {
              const active = isNavItemActive(route, item);
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    class={`block rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted ${
                      active ? "bg-muted font-medium text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </details>
      ))}
    </nav>
  );
}

export function DashboardShell({
  route,
  title,
  description,
  toolbar,
  children,
}: DashboardShellProps) {
  return (
    <div class="flex min-h-screen bg-background">
      <aside class="hidden w-64 shrink-0 border-r bg-muted/20 lg:flex lg:flex-col">
        <div class="flex h-14 items-center border-b px-4">
          <a href="/" class="text-sm font-semibold tracking-tight">
            Otok Playground
          </a>
        </div>
        <div class="flex-1 overflow-y-auto">
          <SidebarNav route={route} />
        </div>
        <div class="border-t p-4">
          <div class="flex items-center gap-3">
            <Avatar size="sm">
              <AvatarFallback>{dashboardUser.initials}</AvatarFallback>
            </Avatar>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{dashboardUser.name}</p>
              <p class="truncate text-xs text-muted-foreground">{dashboardUser.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <details class="lg:hidden">
            <summary class="cursor-pointer list-none rounded-md border px-2.5 py-1.5 text-sm [&::-webkit-details-marker]:hidden">
              Menu
            </summary>
            <div class="absolute left-0 right-0 top-14 z-20 border-b bg-background p-4 shadow-sm">
              <SidebarNav route={route} />
            </div>
          </details>
          {toolbar}
          <div class="ms-auto flex items-center gap-2">
            <Avatar size="sm" class="lg:hidden">
              <AvatarFallback>{dashboardUser.initials}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main class="flex-1 p-4 md:p-6">
          <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="space-y-1">
              <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
              {description ? <p class="text-sm text-muted-foreground">{description}</p> : null}
            </div>
            <div class="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Download
              </Button>
            </div>
          </div>
          <Separator class="mb-6" />
          {children}
        </main>
      </div>
    </div>
  );
}

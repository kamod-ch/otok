export type NavItem = {
  label: string;
  href: string;
  match?: (route: string) => boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const dashboardNavGroups: NavGroup[] = [
  {
    label: "Dashboards",
    items: [{ label: "Classic Dashboard", href: "/" }],
  },
  {
    label: "Pages",
    items: [
      { label: "Zero-JS route", href: "/about" },
      { label: "kamod-ui islands", href: "/demo" },
      { label: "Progressive forms", href: "/projects" },
      {
        label: "Catch-all docs",
        href: "/docs/routing/catch-all",
        match: (route) => route.startsWith("/docs/") || route === "/docs/:slug*",
      },
      {
        label: "Dynamic route",
        href: "/users/alice",
        match: (route) => route.startsWith("/users/") || route === "/users/:id",
      },
    ],
  },
];

export function isNavItemActive(route: string, item: NavItem): boolean {
  if (item.match) return item.match(route);
  return route === item.href || (item.href !== "/" && route === item.href);
}

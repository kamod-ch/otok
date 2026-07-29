import type { RouteEntry, RoutesScanResult } from "./parser.js";

export interface RouteTreeNode {
  name: string;
  kind: "root" | "static" | "dynamic" | "optional" | "catchall" | "layout" | "special";
  route?: RouteEntry;
  children: RouteTreeNode[];
}

export function buildRouteTree(scan: RoutesScanResult): RouteTreeNode {
  const root: RouteTreeNode = { name: "", kind: "root", children: [] };

  const uniqueByPattern = new Map<string, RouteEntry>();
  for (const route of scan.routes) {
    if (!uniqueByPattern.has(route.routePattern)) uniqueByPattern.set(route.routePattern, route);
  }

  for (const route of [...uniqueByPattern.values()].sort((a, b) => a.routePattern.localeCompare(b.routePattern))) {
    insertRoute(root, route);
  }

  if (scan.notFoundRoute) {
    root.children.push({
      name: "_not-found",
      kind: "special",
      route: scan.notFoundRoute,
      children: [],
    });
  }

  if (scan.errorRoute) {
    root.children.push({
      name: "_error",
      kind: "special",
      route: scan.errorRoute,
      children: [],
    });
  }

  return root;
}

function insertRoute(root: RouteTreeNode, route: RouteEntry): void {
  const segments = route.routePattern.split("/").filter(Boolean);
  let current = root;

  if (segments.length === 0) {
    current.children.push({
      name: "index",
      kind: "static",
      route,
      children: [],
    });
    return;
  }

  for (const segment of segments) {
    const { name, kind } = describeSegment(segment);
    let child = current.children.find((node) => node.name === name);
    if (!child) {
      child = { name, kind, children: [] };
      current.children.push(child);
    }
    current = child;
  }

  current.route = route;
}

function describeSegment(segment: string): { name: string; kind: RouteTreeNode["kind"] } {
  const catchAll = /^\[\.\.\.([^\]]+)\]$/.exec(segment);
  if (catchAll) return { name: `[...${catchAll[1]}]`, kind: "catchall" };

  const optional = /^\[\[([^\]]+)\]\]$/.exec(segment);
  if (optional) return { name: `[[${optional[1]}]]`, kind: "optional" };

  const dynamic = /^\[([^\]]+)\]$/.exec(segment);
  if (dynamic) return { name: `[${dynamic[1]}]`, kind: "dynamic" };

  return { name: segment, kind: "static" };
}

export function formatRouteTree(scan: RoutesScanResult): string {
  const tree = buildRouteTree(scan);
  const lines: string[] = ["Route tree", "==========", ""];

  renderNode(tree, "", lines, true);

  lines.push("");
  lines.push(`Total routes: ${scan.routes.length}`);
  lines.push(`Unique patterns: ${new Set(scan.routes.map((route) => route.routePattern)).size}`);

  return lines.join("\n");
}

function renderNode(node: RouteTreeNode, prefix: string, lines: string[], isLast: boolean): void {
  if (node.kind !== "root") {
    const connector = isLast ? "└── " : "├── ";
    const routeInfo = node.route ? `  → ${node.route.routePath}` : "";
    const fileInfo = node.route ? `\n${prefix}${isLast ? "    " : "│   "}    ${relativeDisplayPath(node.route.file)}` : "";
    lines.push(`${prefix}${connector}${node.name}${routeInfo}${fileInfo}`);
    prefix += isLast ? "    " : "│   ";
  }

  node.children.forEach((child, index) => {
    renderNode(child, prefix, lines, index === node.children.length - 1);
  });
}

function relativeDisplayPath(file: string): string {
  const parts = file.split(/[/\\]/);
  const routesIndex = parts.lastIndexOf("routes");
  if (routesIndex >= 0) return parts.slice(routesIndex).join("/");
  return parts.slice(-3).join("/");
}

export function formatRouteList(scan: RoutesScanResult): string {
  const lines = ["Path", "Pattern", "File", "─".repeat(72)];

  for (const route of scan.routes) {
    lines.push(`${route.routePath.padEnd(24)} ${route.routePattern.padEnd(28)} ${relativeDisplayPath(route.file)}`);
  }

  return lines.join("\n");
}

import { h, type ComponentChildren } from "preact";
import type { OtokDevtoolsSnapshot } from "otok/devtools";

export interface DevtoolsPanelProps {
  open: boolean;
  snapshot: OtokDevtoolsSnapshot | null;
  error: string | null;
  onToggle: () => void;
}

const styles = {
  toggle:
    "position:fixed;bottom:16px;right:16px;z-index:99999;background:#111827;color:#f9fafb;border:1px solid #374151;border-radius:999px;padding:10px 14px;font:600 12px/1 system-ui,sans-serif;cursor:pointer;",
  panel:
    "position:fixed;bottom:64px;right:16px;z-index:99999;width:min(420px,calc(100vw - 32px));max-height:min(70vh,640px);overflow:auto;background:#0b1220;color:#e5e7eb;border:1px solid #1f2937;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.35);font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;",
  header:
    "position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#111827;border-bottom:1px solid #1f2937;",
  section: "padding:12px 14px;border-bottom:1px solid #1f2937;",
  badge: "display:inline-block;padding:2px 6px;border-radius:999px;background:#1d4ed8;color:#eff6ff;font-size:10px;",
  muted: "color:#9ca3af",
};

export function DevtoolsPanel({ open, snapshot, error, onToggle }: DevtoolsPanelProps) {
  return h("div", null, [
    h("button", { type: "button", style: styles.toggle, onClick: onToggle }, open ? "Close Otok Devtools" : "Otok Devtools"),
    open
      ? h(
          "div",
          { style: styles.panel, role: "region", "aria-label": "Otok Devtools" },
          [
            h("div", { style: styles.header }, [
              h("strong", null, "Otok Devtools"),
              h("span", { style: styles.muted }, snapshot ? new Date(snapshot.updatedAt).toLocaleTimeString() : "—"),
            ]),
            error ? h(Section, { title: "Error" }, h("p", null, error)) : null,
            snapshot ? h(SnapshotView, { snapshot }) : h(Section, { title: "Loading" }, h("p", { style: styles.muted }, "Waiting for snapshot…")),
          ],
        )
      : null,
  ]);
}

function SnapshotView({ snapshot }: { snapshot: OtokDevtoolsSnapshot }) {
  const latest = snapshot.requests.at(-1);
  return h("div", null, [
    h(Section, { title: "Route tree" }, h(RouteTree, { routes: snapshot.routes })),
    h(Section, { title: "Plugins" }, h(List, { items: snapshot.plugins.map((plugin) => `${plugin.name}${plugin.version ? `@${plugin.version}` : ""}`) })),
    h(Section, { title: "Latest request" }, latest ? h(LatestRequest, { request: latest }) : h("p", { style: styles.muted }, "No requests yet.")),
    h(Section, { title: "Middleware timing" }, h(TimingList, { items: snapshot.middleware.slice(-8) })),
    h(Section, { title: "Loader / action timing" }, h(LoaderTimingList, { items: snapshot.loaders.slice(-8) })),
    h(Section, { title: "Plugin hooks" }, h(TimingList, { items: snapshot.pluginHooks.slice(-8).map((item) => ({ ...item, route: `${item.plugin}:${item.hook}` })) })),
  ]);
}

function RouteTree({ routes }: { routes: OtokDevtoolsSnapshot["routes"] }) {
  if (routes.length === 0) return h("p", { style: styles.muted }, "No routes registered.");
  return h(
    "ul",
    { style: "margin:0;padding-left:16px;" },
    routes.map((route) =>
      h("li", { key: route.id }, [
        h("code", null, route.path),
        " ",
        h("span", { style: styles.muted }, [
          route.hasLoader ? "loader " : "",
          route.hasAction ? "action " : "",
          route.middlewareCount ? `${route.middlewareCount} mw ` : "",
          route.client ? "csr " : "",
          route.layoutCount ? `${route.layoutCount} layout` : "",
        ]),
      ]),
    ),
  );
}

function LatestRequest({ request }: { request: OtokDevtoolsSnapshot["requests"][number] }) {
  return h("div", null, [
    h("p", null, [h("span", { style: styles.badge }, request.method), " ", h("code", null, request.pathname)]),
    h("p", { style: styles.muted }, [
      `route: ${request.route ?? "—"} · status ${request.status} · mode ${request.renderMode}`,
    ]),
    request.redirect ? h("p", null, ["redirect → ", h("code", null, request.redirect)]) : null,
    request.locale ? h("p", null, ["locale ", h("code", null, request.locale)]) : null,
    request.auth
      ? h("p", null, [
          "auth ",
          request.auth.authenticated ? h("span", { style: styles.badge }, request.auth.userId ?? "yes") : "guest",
        ])
      : null,
    request.islands.length > 0
      ? h("p", null, ["islands ", h("code", null, request.islands.join(", "))])
      : null,
    h("p", { style: styles.muted }, [
      `timings mw ${request.timings.middlewareMs.toFixed(1)}ms · loader ${request.timings.loaderMs.toFixed(1)}ms · render ${request.timings.renderMs.toFixed(1)}ms · total ${request.timings.totalMs.toFixed(1)}ms`,
    ]),
  ]);
}

function TimingList({
  items,
}: {
  items: Array<{ route: string; durationMs: number; index?: number }>;
}) {
  if (items.length === 0) return h("p", { style: styles.muted }, "No events.");
  return h(
    "ul",
    { style: "margin:0;padding-left:16px;" },
    items.map((item, index) =>
      h("li", { key: `${item.route}-${index}` }, [
        h("code", null, item.route),
        item.index !== undefined ? ` #${item.index}` : "",
        ": ",
        `${item.durationMs.toFixed(1)}ms`,
      ]),
    ),
  );
}

function LoaderTimingList({ items }: { items: OtokDevtoolsSnapshot["loaders"] }) {
  if (items.length === 0) return h("p", { style: styles.muted }, "No loader events.");
  return h(
    "ul",
    { style: "margin:0;padding-left:16px;" },
    items.map((item, index) =>
      h("li", { key: `${item.route}-${index}` }, [
        h("code", null, item.route),
        ` ${item.kind} ${item.durationMs.toFixed(1)}ms`,
        item.validation ? " validation" : "",
        item.redirect ? ` → ${item.redirect}` : "",
      ]),
    ),
  );
}

function List({ items }: { items: string[] }) {
  if (items.length === 0) return h("p", { style: styles.muted }, "None.");
  return h(
    "ul",
    { style: "margin:0;padding-left:16px;" },
    items.map((item) => h("li", { key: item }, item)),
  );
}

function Section({ title, children }: { title: string; children?: ComponentChildren }) {
  return h("section", { style: styles.section }, [h("h3", { style: "margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#93c5fd;" }, title), children]);
}

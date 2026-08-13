import { h, render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { DevtoolsPanel } from "./panel.js";

export interface MountDevtoolsPanelOptions {
  endpoint?: string;
}

export function mountDevtoolsPanel(options: MountDevtoolsPanelOptions = {}): void {
  if (typeof document === "undefined") return;
  if (typeof import.meta !== "undefined" && !(import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV) {
    return;
  }

  const host = document.createElement("div");
  host.id = "otok-devtools-root";
  document.body.appendChild(host);
  render(h(DevtoolsShell, { endpoint: options.endpoint ?? "/__otok_devtools" }), host);
}

function DevtoolsShell({ endpoint }: { endpoint: string }) {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<DevtoolsSnapshotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(endpoint, { credentials: "same-origin" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as DevtoolsSnapshotResponse;
        if (!cancelled) {
          setSnapshot(payload);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [endpoint, open]);

  return h(DevtoolsPanel, {
    open,
    snapshot: snapshot?.snapshot ?? null,
    error,
    onToggle: () => setOpen((value) => !value),
  });
}

interface DevtoolsSnapshotResponse {
  enabled: boolean;
  snapshot: import("@kamod-ch/otok/devtools").OtokDevtoolsSnapshot | null;
}

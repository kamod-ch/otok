import { useMemo, useState } from "preact/hooks";
import type { Finding } from "../data/audits";
import { SeverityBadge } from "../components/severity-badge";

export default function FindingFilter({ findings }: { findings: Finding[] }) {
  const [severity, setSeverity] = useState("all");
  const filtered = useMemo(
    () => findings.filter((finding) => severity === "all" || finding.severity === severity),
    [findings, severity],
  );

  return (
    <section class="card interactive">
      <div class="toolbar">
        <h2>Interactive finding triage</h2>
        <select value={severity} onInput={(event) => setSeverity(event.currentTarget.value)} aria-label="Filter findings">
          <option value="all">All severities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <ul class="findings">
        {filtered.map((finding) => (
          <li key={finding.id}>
            <SeverityBadge severity={finding.severity} />
            <strong>{finding.title}</strong>
            <p>{finding.detail}</p>
            <code>{finding.file}</code>
          </li>
        ))}
      </ul>
    </section>
  );
}

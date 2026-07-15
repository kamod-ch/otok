import type { FindingSeverity } from "../data/audits";

const labels: Record<FindingSeverity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function SeverityBadge({ severity }: { severity: FindingSeverity }) {
  return <span class={`badge ${severity}`}>{labels[severity]}</span>;
}

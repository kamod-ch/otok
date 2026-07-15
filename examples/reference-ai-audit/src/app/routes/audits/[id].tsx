import { Island } from "otok/client";
import { notFound, type OtokPageProps } from "otok/server";
import { SeverityBadge } from "../../components/severity-badge";
import { audits, type Audit } from "../../data/audits";
import FindingFilter from "../../islands/finding-filter";

export const loader = ({ params }: { params: Record<string, string> }) => {
  const audit = audits.get(params.id);
  if (!audit) notFound();
  return { audit };
};

export const head = ({ data }: { data: { audit: Audit } }) => ({
  title: `Audit: ${data.audit.repo}`,
  meta: [{ name: "description", content: data.audit.summary }],
});

export default function AuditDetail({ data }: OtokPageProps<{ audit: Audit }>) {
  const { audit } = data;
  return (
    <>
      <section class="hero compact">
        <p class="eyebrow">{audit.status}</p>
        <h1>{audit.repo}</h1>
        <p>{audit.summary}</p>
        <dl class="facts">
          <div><dt>Branch</dt><dd>{audit.branch}</dd></div>
          <div><dt>Created</dt><dd>{new Date(audit.createdAt).toLocaleString()}</dd></div>
          <div><dt>Findings</dt><dd>{audit.findings.length}</dd></div>
        </dl>
      </section>

      <section class="card">
        <h2>Server-rendered findings</h2>
        <ul class="findings">
          {audit.findings.map((finding) => (
            <li key={finding.id}>
              <SeverityBadge severity={finding.severity} />
              <strong>{finding.title}</strong>
              <p>{finding.detail}</p>
              <code>{finding.file}</code>
            </li>
          ))}
        </ul>
      </section>

      <Island component={FindingFilter} props={{ findings: audit.findings }} strategy="visible" />
    </>
  );
}

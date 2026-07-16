import { fail, redirect, type OtokActionContext, type OtokPageProps } from "otok/server";
import { audits, type Audit } from "../data/audits";

export const head = () => ({ title: "AI Audit Dashboard" });

export const loader = () => ({ audits: audits.list() as Audit[] });

export async function action({ formData }: OtokActionContext) {
  const repo = String(formData?.get("repo") ?? "").trim();
  const branch = String(formData?.get("branch") ?? "main").trim();
  const fieldErrors: Record<string, string[]> = {};

  if (!repo) fieldErrors.repo = ["Repository URL is required."];
  if (repo && !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+/.test(repo)) {
    fieldErrors.repo = ["Use a public GitHub repository URL for this demo."];
  }

  if (Object.keys(fieldErrors).length > 0) {
    fail(400, { message: "Validation failed", fieldErrors });
  }

  const audit = audits.create({ repo, branch });
  redirect(`/audits/${audit.id}`, 303);
}

export default function Dashboard({ data, actionData }: OtokPageProps) {
  const auditsList = (data as unknown as { audits: Audit[] }).audits;
  const error = (actionData as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors?.repo?.[0];
  return (
    <>
      <section class="hero">
        <p class="eyebrow">Reference project</p>
        <h1>AI-assisted repository audits without framework magic.</h1>
        <p>
          This app demonstrates route actions, progressive forms, server-rendered results, API routes, and an opt-in island for triage.
        </p>
      </section>

      <section class="grid two">
        <form method="post" class="card">
          <h2>Start an audit</h2>
          <label>
            Repository URL
            <input name="repo" placeholder="https://github.com/kamod-ch/otok" aria-invalid={Boolean(error)} />
          </label>
          {error ? <p role="alert" class="form-error">{error}</p> : null}
          <label>
            Branch
            <input name="branch" value="main" />
          </label>
          <button class="button">Run deterministic audit</button>
          <p class="hint">No external AI service is called; seeded findings make the example reproducible.</p>
        </form>

        <section class="card">
          <h2>Recent audits</h2>
          <ul class="audits">
            {auditsList.map((audit) => (
              <li key={audit.id}>
                <a href={`/audits/${audit.id}`}>{audit.repo}</a>
                <span>{audit.findings.length} findings</span>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </>
  );
}

import type { InstanceDetail, InstanceListItem, StepListItem } from "../dto/redact.js";
import { CSRF_FIELD } from "../csrf.js";
import { canApprove, canCancel, canPause, canResume } from "../state-matrix.js";
import type { WorkflowInstance } from "@kamod-ch/otok-workflows";

function esc(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function layout(title: string, body: string, flash?: string): string {
  const flashHtml = flash ? `<div role="status" aria-live="polite" class="flash">${esc(flash)}</div>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 1.5rem; max-width: 960px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 0.4rem 0.6rem; text-align: left; }
    .flash { padding: 0.75rem; background: #e8f5e9; margin-bottom: 1rem; }
    .error { color: #b00020; }
    form.inline { display: inline; margin-right: 0.5rem; }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  </style>
</head>
<body>
  <header><h1>Workflow operations</h1><nav><a href="/ops/workflows/instances">Instances</a></nav></header>
  ${flashHtml}
  <main>${body}</main>
</body>
</html>`;
}

export function loginPage(csrf: string, error?: string): string {
  const err = error ? `<p class="error" role="alert">${esc(error)}</p>` : "";
  return layout(
    "Login",
    `${err}
    <form method="post" action="/login">
      <input type="hidden" name="${CSRF_FIELD}" value="${esc(csrf)}" />
      <label>Password <input type="password" name="password" required autocomplete="current-password" /></label>
      <button type="submit">Sign in</button>
    </form>`,
  );
}

export function listPage(
  items: InstanceListItem[],
  query: { status?: string; workflowName?: string; limit: number },
  csrf: string,
): string {
  const rows = items
    .map(
      (i) =>
        `<tr><td><a href="/ops/workflows/instances/${esc(i.id)}">${esc(i.id)}</a></td><td>${esc(i.workflowName)}</td><td>${esc(i.status)}</td><td>${i.progress}</td><td>${esc(i.updatedAt)}</td></tr>`,
    )
    .join("");
  return layout(
    "Instances",
    `<form method="get" action="/ops/workflows/instances">
      <label>Status <input name="status" value="${esc(query.status ?? "")}" /></label>
      <label>Name <input name="workflowName" value="${esc(query.workflowName ?? "")}" /></label>
      <label>Limit <input name="limit" type="number" min="1" max="100" value="${query.limit}" /></label>
      <button type="submit">Filter</button>
    </form>
    <table><thead><tr><th>ID</th><th>Workflow</th><th>Status</th><th>Progress</th><th>Updated</th></tr></thead>
    <tbody>${rows || "<tr><td colspan=5>No instances</td></tr>"}</tbody></table>`,
  );
}

export function detailPage(
  instance: InstanceDetail,
  steps: StepListItem[],
  raw: WorkflowInstance,
  now: Date,
  csrf: string,
  flash?: string,
): string {
  const actions: string[] = [];
  if (canPause(raw, now)) {
    actions.push(`<form class="inline" method="post" action="/ops/workflows/instances/${esc(instance.id)}/pause">
      <input type="hidden" name="${CSRF_FIELD}" value="${esc(csrf)}" />
      <button type="submit">Pause</button></form>`);
  }
  if (canResume(raw)) {
    actions.push(`<form class="inline" method="post" action="/ops/workflows/instances/${esc(instance.id)}/resume">
      <input type="hidden" name="${CSRF_FIELD}" value="${esc(csrf)}" />
      <button type="submit">Resume (paused)</button></form>`);
  }
  if (canApprove(raw)) {
    actions.push(`<form class="inline" method="post" action="/ops/workflows/instances/${esc(instance.id)}/approve">
      <input type="hidden" name="${CSRF_FIELD}" value="${esc(csrf)}" />
      <input type="hidden" name="confirm" value="approve" />
      <button type="submit">Approve and continue</button></form>`);
  }
  if (canCancel(raw)) {
    actions.push(`<form class="inline" method="post" action="/ops/workflows/instances/${esc(instance.id)}/cancel">
      <input type="hidden" name="${CSRF_FIELD}" value="${esc(csrf)}" />
      <input type="hidden" name="confirm" value="cancel" />
      <button type="submit">Cancel workflow</button></form>`);
  }
  const stepRows = steps
    .map(
      (s) =>
        `<tr><td>${esc(s.stepName)}</td><td>${esc(s.status)}</td><td>${s.attempt}</td><td>${esc(s.startedAt ?? "")}</td><td>${esc(s.completedAt ?? "")}</td></tr>`,
    )
    .join("");
  return layout(
    `Instance ${instance.id}`,
    `<p><strong>Status:</strong> ${esc(instance.status)} · <strong>Workflow:</strong> ${esc(instance.workflowName)}</p>
    <p>Updated: ${esc(instance.updatedAt)}${instance.leaseOwner ? ` · Lease: ${esc(instance.leaseOwner)} until ${esc(instance.leaseUntil ?? "")}` : ""}</p>
    ${instance.error ? `<p class="error">${esc(instance.error)}</p>` : ""}
    <div>${actions.join("") || "<em>No actions for this state</em>"}</div>
    <h2>Steps</h2>
    <table><thead><tr><th>Name</th><th>Status</th><th>Attempt</th><th>Started</th><th>Completed</th></tr></thead>
    <tbody>${stepRows || "<tr><td colspan=5>No steps</td></tr>"}</tbody></table>`,
    flash,
  );
}

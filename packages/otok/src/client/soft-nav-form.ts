import { OTOK_FORM_ERROR_ATTR, OTOK_FORM_IDEMPOTENCY_ATTR, OTOK_FORM_STATE_ATTR } from "../shared/navigation.js";
import { createIdempotencyKey, OTOK_IDEMPOTENCY_FIELD, OTOK_IDEMPOTENCY_HEADER } from "../shared/mutations.js";

export type SoftFormSubmitKind =
  | "handled"
  | "validation"
  | "native-fallback"
  | "aborted"
  | "error"
  | "ambiguous"
  | "stale";

export interface SoftFormSubmitResult {
  kind: SoftFormSubmitKind;
  message?: string;
}

const SUPPORTED_METHODS = new Set(["get", "post"]);
const SUPPORTED_ENCTYPES = new Set(["application/x-www-form-urlencoded", "multipart/form-data"]);

export interface SoftNavFormSupport {
  ok: true;
  method: "GET" | "POST";
  enctype: string;
  action: URL;
}
export interface SoftNavFormUnsupported {
  ok: false;
  reason: string;
}

export type SoftNavFormAnalysis = SoftNavFormSupport | SoftNavFormUnsupported;

function submitControl(submitter: HTMLElement | undefined): HTMLButtonElement | HTMLInputElement | undefined {
  return submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement ? submitter : undefined;
}

export function getFormEnctype(form: HTMLFormElement, submitter?: HTMLElement): string {
  const control = submitControl(submitter);
  const raw = (control?.formEnctype || form.enctype || "").trim().toLowerCase();
  if (!raw || raw === "application/x-www-form-urlencoded") return "application/x-www-form-urlencoded";
  if (raw === "multipart/form-data") return "multipart/form-data";
  return raw;
}

export function analyzeSoftNavFormSupport(
  form: HTMLFormElement,
  submitter: HTMLElement | undefined,
  location: Location,
): SoftNavFormAnalysis {
  const control = submitControl(submitter);
  const method = (control?.formMethod || form.method || "get").toLowerCase();
  if (!SUPPORTED_METHODS.has(method)) {
    return { ok: false, reason: `unsupported-method:${method}` };
  }

  const target = control?.formTarget || form.target;
  if (target && target !== "_self") {
    return { ok: false, reason: "unsupported-target" };
  }

  const enctype = getFormEnctype(form, submitter);
  if (!SUPPORTED_ENCTYPES.has(enctype)) {
    return { ok: false, reason: `unsupported-enctype:${enctype}` };
  }

  const action = (control?.formAction || form.action || location.href).trim();
  let url: URL;
  try {
    url = new URL(action, location.href);
  } catch {
    return { ok: false, reason: "invalid-action" };
  }

  if (url.origin !== location.origin) return { ok: false, reason: "external-action" };
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, reason: "invalid-protocol" };
  if (url.pathname.startsWith("/api/")) return { ok: false, reason: "api-action" };

  if (method === "get" && enctype === "multipart/form-data") {
    return { ok: false, reason: "get-multipart" };
  }

  if (!form.noValidate && !form.checkValidity()) {
    return { ok: false, reason: "native-validation" };
  }

  return {
    ok: true,
    method: method === "post" ? "POST" : "GET",
    enctype,
    action: url,
  };
}

export function formDataWithSubmitter(form: HTMLFormElement, submitter?: HTMLElement): FormData {
  try {
    return new FormData(form, submitter instanceof HTMLElement ? submitter : undefined);
  } catch {
    const data = new FormData(form);
    if (
      (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) &&
      submitter.name &&
      !submitter.disabled
    ) {
      data.append(submitter.name, submitter.value);
    }
    return data;
  }
}

function ensureIdempotencyFields(form: HTMLFormElement, body: FormData, method: "GET" | "POST"): string | undefined {
  if (method === "GET") return undefined;
  if (body.has(OTOK_IDEMPOTENCY_FIELD)) return String(body.get(OTOK_IDEMPOTENCY_FIELD));
  let key = form.getAttribute(OTOK_FORM_IDEMPOTENCY_ATTR);
  if (!key) {
    key = createIdempotencyKey();
    form.setAttribute(OTOK_FORM_IDEMPOTENCY_ATTR, key);
  }
  body.set(OTOK_IDEMPOTENCY_FIELD, key);
  return key;
}

export function nativeRequestSubmit(form: HTMLFormElement, submitter?: HTMLElement): void {
  if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
    form.requestSubmit(submitter);
    return;
  }
  form.requestSubmit();
}

export function setFormSubmitting(form: HTMLFormElement, submitting: boolean): void {
  form.setAttribute(OTOK_FORM_STATE_ATTR, submitting ? "submitting" : "idle");
  for (const element of form.querySelectorAll("button,input[type='submit'],input[type='image']")) {
    if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
      element.disabled = submitting;
    }
  }
}

export function clearFormSubmitError(form: HTMLFormElement): void {
  form.querySelector(`[${OTOK_FORM_ERROR_ATTR}]`)?.remove();
}

export function showFormSubmitError(form: HTMLFormElement, message: string): void {
  clearFormSubmitError(form);
  const alert = document.createElement("p");
  alert.setAttribute(OTOK_FORM_ERROR_ATTR, "");
  alert.setAttribute("role", "alert");
  alert.tabIndex = -1;
  alert.className = "otok-form-error";
  alert.textContent = message;
  form.prepend(alert);
  alert.focus();
}

export function isValidationHtmlResponse(response: Response): boolean {
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) return false;
  return response.status === 400 || response.status === 422;
}

export function buildSoftFormFetchInit(
  form: HTMLFormElement,
  submitter: HTMLElement | undefined,
  analysis: SoftNavFormSupport,
  signal: AbortSignal,
): { url: URL; init: RequestInit; idempotencyKey?: string } {
  const body = formDataWithSubmitter(form, submitter);
  const idempotencyKey = ensureIdempotencyFields(form, body, analysis.method);
  const fetchUrl = new URL(analysis.action.href);
  const headers: Record<string, string> = { Accept: "text/html" };
  if (idempotencyKey) headers[OTOK_IDEMPOTENCY_HEADER] = idempotencyKey;

  const init: RequestInit = {
    signal,
    headers,
    credentials: "same-origin",
    redirect: "follow",
  };

  if (analysis.method === "GET") {
    const search = new URLSearchParams();
    for (const [key, value] of body) {
      search.append(key, typeof value === "string" ? value : value.name);
    }
    fetchUrl.search = search.toString();
    return { url: fetchUrl, init, idempotencyKey };
  }

  init.method = "POST";
  if (analysis.enctype === "multipart/form-data") {
    init.body = body;
    return { url: fetchUrl, init, idempotencyKey };
  }

  const params = new URLSearchParams();
  for (const [key, value] of body) {
    if (typeof value === "string") params.append(key, value);
    else params.append(key, value.name);
  }
  init.body = params;
  headers["Content-Type"] = "application/x-www-form-urlencoded";
  return { url: fetchUrl, init, idempotencyKey };
}

export function historyPathFromUrl(url: string): string {
  const final = new URL(url, window.location.href);
  return `${final.pathname}${final.search}${final.hash}`;
}

export const defaultSoftFormErrorMessages: Record<
  Exclude<SoftFormSubmitKind, "handled" | "validation" | "native-fallback" | "stale">,
  string
> = {
  aborted: "Submission cancelled. Your data was not sent again — you can retry when ready.",
  ambiguous:
    "The server response was unclear after your submission. Please check whether the action completed before retrying.",
  error: "Network error while submitting the form. Please try again.",
};

export function isSoftFormSubmitSettled(result: SoftFormSubmitResult): boolean {
  return result.kind === "handled" || result.kind === "validation";
}

/** @deprecated Prefer `isSoftFormSubmitSettled` — kept for boolean compatibility. */
export function softFormSubmitToLegacyBoolean(result: SoftFormSubmitResult): boolean {
  return isSoftFormSubmitSettled(result);
}

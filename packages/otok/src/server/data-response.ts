import {
  isDataRequest,
  OTOK_DATA_ACCEPT,
  serializeActionData,
  serializeLoaderData,
  type OtokDataResponse,
} from "../shared/mutations.js";
import type { ActionResult, LoaderResult, OtokFailure } from "../shared/routes.js";

export function buildDataResponse<TAction, TLoader>(
  payload: OtokDataResponse<TAction, TLoader>,
  status = 200,
): Response {
  const headers = new Headers({
    "content-type": `${OTOK_DATA_ACCEPT}; charset=utf-8`,
    "cache-control": "no-store",
  });
  return new Response(JSON.stringify(payload), { status, headers });
}

export function dataResponseFromActionResult(
  result: ActionResult,
  loaderData?: LoaderResult,
  redirect?: string,
): Response {
  const actionData = serializeActionData(result);
  const isFailure =
    actionData &&
    typeof actionData === "object" &&
    "status" in actionData &&
    typeof (actionData as OtokFailure).status === "number";

  const status = isFailure ? (actionData as OtokFailure).status : redirect ? 200 : 200;

  return buildDataResponse({
    actionData: isFailure ? undefined : actionData,
    loaderData: serializeLoaderData(loaderData ?? {}),
    redirect,
    error: isFailure ? (actionData as OtokFailure) : undefined,
  }, isFailure ? (actionData as OtokFailure).status : status);
}

export function dataResponseFromRedirect(location: string, status: number): Response {
  return buildDataResponse({ redirect: location }, status >= 300 && status < 400 ? 200 : status);
}

export function dataResponseFromError(error: OtokFailure): Response {
  return buildDataResponse({ error }, error.status);
}

export function wantsDataResponse(request: Request): boolean {
  return isDataRequest(request);
}

export { isDataRequest };

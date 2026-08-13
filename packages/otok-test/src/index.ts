export { parseHtml, type ParsedElement, type ParsedHtml } from "./html.js";
export {
  createTestApp,
  createTestRoute,
  type CreateTestAppOptions,
  type TestRouteInput,
} from "./create-app.js";
export {
  createOtokTestApp,
  OtokTestApp,
  OtokTestResponse,
  type CreateOtokTestAppOptions,
  type OtokTestRenderResult,
  type OtokTestRequestOptions,
} from "./app.js";
export {
  expectRedirect,
  expectValidationDocument,
  expectValidationError,
  readValidationFailure,
  type RedirectExpectation,
  type ValidationExpectation,
} from "./assertions.js";
export {
  authenticatedSession,
  createTestSession,
  mergeSessionHeaders,
  sessionCookieHeader,
  type CreateTestSessionInput,
  type OtokTestSession,
} from "./session.js";
export {
  expectClientEntry,
  expectIsland,
  expectSsrPageMarker,
  getIslands,
  type ExpectIslandOptions,
  type ParsedIsland,
} from "./islands.js";
export { createPluginTestApp, resolvePluginTestConfig, type PluginTestAppOptions } from "./plugin.js";
export {
  createI18nTestContext,
  expectHreflang,
  expectLocale,
  i18nAcceptLanguageHeader,
  prefixedLocalePath,
  type I18nTestConfig,
} from "./i18n.js";
export {
  createDatabaseTestHooks,
  withTestDatabase,
  type TestDatabaseHooks,
} from "./database.js";
export {
  expectTypeOf,
  type AssertEqual,
  type Expect,
  type ExpectAssignable,
  type ExpectFalse,
  type ExpectTrue,
} from "./types.js";

import type { Hono } from "hono";
import { parseHtml, type ParsedHtml } from "./html.js";
import { createTestApp, type CreateTestAppOptions } from "./create-app.js";

export interface RenderRouteResult {
  response: Response;
  html: string;
}

export async function requestRoute(
  appOrOptions: Hono | CreateTestAppOptions,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const app = "request" in appOrOptions ? appOrOptions : createTestApp(appOrOptions);
  return await app.request(path, init);
}

export async function renderRoute(
  appOrOptions: Hono | CreateTestAppOptions,
  path: string,
  init?: RequestInit,
): Promise<RenderRouteResult> {
  const response = await requestRoute(appOrOptions, path, init);
  return { response, html: await response.text() };
}

/** Render a route and return a parsed HTML document for assertions. */
export async function renderParsedRoute(
  appOrOptions: Hono | CreateTestAppOptions,
  path: string,
  init?: RequestInit,
): Promise<RenderRouteResult & { document: ParsedHtml }> {
  const result = await renderRoute(appOrOptions, path, init);
  return { ...result, document: parseHtml(result.html) };
}

export type { OtokRoute } from "@kamod-ch/otok/server";

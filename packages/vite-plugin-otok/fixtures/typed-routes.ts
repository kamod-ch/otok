/**
 * Compile-time fixtures for virtual:otok-routes typed helpers.
 * Run with: pnpm typecheck:typed-routes
 */
import { route, type OtokRouteParams } from "virtual:otok-routes";

export const userHref = route("/users/[id]", { params: { id: "alice" } });
export const docsHref = route("/docs/[...slug]", {
  params: { slug: ["routing", "catch-all"] },
  query: { ref: "typed-routes", tag: ["docs", "api"], empty: undefined },
});
export const aboutHref = route("/[[lang]]/about", { params: { lang: "de" } });
export const homeHref = route("/");

const _params: OtokRouteParams<"/users/[id]"> = { id: "alice" };
void _params;
void userHref;
void docsHref;
void aboutHref;
void homeHref;

// @ts-expect-error id is required for this route pattern.
route("/users/[id]");

// @ts-expect-error catch-all params must be strings, numbers, booleans, or arrays of those values.
route("/docs/[...slug]", { params: { slug: { invalid: true } } });

// @ts-expect-error optional lang must still be a primitive when provided.
route("/[[lang]]/about", { params: { lang: { bad: true } } });

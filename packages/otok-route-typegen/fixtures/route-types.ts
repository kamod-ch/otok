/**
 * Type-level fixtures for generated route module types.
 * Run: pnpm typecheck:route-types (from otok-route-typegen)
 */
import type { RouteBuildOptionsFor, RouteParamsFromPattern } from "@kamod-ch/otok/route";

type CompanyParams = RouteParamsFromPattern<"companies/[companyId]">;
const _companyParams: CompanyParams = { companyId: "acme" };
void _companyParams;

type DocsParams = RouteParamsFromPattern<"docs/[...slug]">;
const _docsParams: DocsParams = { slug: ["guide", "intro"] };
void _docsParams;

type AboutOptions = RouteBuildOptionsFor<"/[[lang]]/about">;
const _aboutOptions: AboutOptions = { params: { lang: "de" } };
void _aboutOptions;

// @ts-expect-error companyId is required
const _badCompany: CompanyParams = {};

// @ts-expect-error slug must be string or string[]
const _badDocs: DocsParams = { slug: { invalid: true } };

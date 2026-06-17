import type { Context } from "hono";
import type { ComponentChildren, ComponentType } from "preact";
import type { IslandProps, JsonValue } from "./islands.js";
export type RouteParams = Record<string, string>;
export interface OtokContext<Env = unknown> {
    hono: Context<Env extends object ? Env : object>;
    request: Request;
    params: RouteParams;
    route: string;
}
export type LoaderResult = JsonValue | Record<string, JsonValue> | void;
export type OtokLoader<Data extends LoaderResult = LoaderResult> = (context: OtokContext) => Data | Promise<Data>;
export interface OtokPageProps<Data extends LoaderResult = LoaderResult> {
    data: Data;
    params: RouteParams;
    route: string;
}
export interface OtokLayoutProps<Data extends LoaderResult = LoaderResult> extends OtokPageProps<Data> {
    children: ComponentChildren;
}
export interface RouteModule<Data extends LoaderResult = LoaderResult> {
    default: ComponentType<OtokPageProps<Data>>;
    loader?: OtokLoader<Data>;
    head?: (props: OtokPageProps<Data>) => OtokHead | Promise<OtokHead>;
}
export interface LayoutModule<Data extends LoaderResult = LoaderResult> {
    default: ComponentType<OtokLayoutProps<Data>>;
}
export interface OtokRoute {
    id: string;
    path: string;
    pattern: RegExp;
    params: string[];
    module: RouteModule;
    layouts?: LayoutModule[];
}
export interface OtokHead {
    title?: string;
    description?: string;
    lang?: string;
    meta?: Record<string, string>;
    links?: OtokHeadLink[];
    scripts?: OtokHeadScript[];
    jsonLd?: Record<string, JsonValue>;
}
export interface OtokHeadLink {
    rel: string;
    href: string;
    crossorigin?: string;
    as?: string;
    type?: string;
}
export interface OtokHeadScript {
    src?: string;
    type?: string;
    async?: boolean;
    defer?: boolean;
}
export declare class OtokHttpError extends Error {
    readonly status: number;
    readonly headers: Headers;
    constructor(status: number, message?: string, headers?: HeadersInit);
}
export declare function redirect(location: string, status?: number): never;
export declare function notFound(message?: string): never;
export declare function fail(message?: string, status?: number): never;
export declare function isOtokHttpError(error: unknown): error is OtokHttpError;
export type InferLoaderData<T extends OtokLoader> = Awaited<ReturnType<T>>;
export type InferIslandProps<T> = T extends ComponentType<infer Props> ? Props extends IslandProps ? Props : never : never;
//# sourceMappingURL=routes.d.ts.map
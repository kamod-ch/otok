import type { Context } from "hono";
import type { ComponentChildren, ComponentType } from "preact";
import type { IslandProps, JsonValue } from "./islands.js";
export type RouteParams = Record<string, string>;
export interface OtokChrome {
    title?: string;
    description?: string;
    toolbar?: ComponentChildren;
}
export interface OtokContext<Env = unknown> {
    hono: Context<Env extends object ? Env : object>;
    request: Request;
    params: RouteParams;
    route: string;
}
export type LoaderResult = JsonValue | Record<string, JsonValue> | OtokFailure | Response | void;
export interface OtokFailure<T = unknown> {
    status: number;
    message?: string;
    fieldErrors?: Record<string, string[]>;
    formErrors?: string[];
    data?: T;
}
export type OtokResponse = Response | OtokHttpError;
export type OtokLoader<Data extends LoaderResult = LoaderResult> = (context: OtokContext) => Data | Promise<Data>;
export interface OtokPageProps<Data extends LoaderResult = LoaderResult> {
    data: Data;
    params: RouteParams;
    route: string;
}
export interface OtokLayoutProps<Data extends LoaderResult = LoaderResult> extends OtokPageProps<Data> {
    children: ComponentChildren;
    chrome?: OtokChrome;
}
export interface RouteModule<Data extends LoaderResult = LoaderResult> {
    default: ComponentType<OtokPageProps<Data>>;
    loader?: OtokLoader<Data>;
    head?: (props: OtokPageProps<Data>) => OtokHead | Promise<OtokHead>;
    chrome?: (props: OtokPageProps<Data>) => OtokChrome | Promise<OtokChrome>;
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
    readonly failure?: OtokFailure;
    constructor(status: number, message?: string, headers?: HeadersInit, failure?: OtokFailure);
}
export declare function json<T>(data: T, init?: ResponseInit | number): Response;
export declare function redirect(location: string, status?: number): never;
export declare function notFound(message?: string): never;
export declare function fail(status: number, failure: Omit<OtokFailure, "status">): never;
export declare function fail(message?: string, status?: number): never;
export declare function isOtokHttpError(error: unknown): error is OtokHttpError;
export declare function isOtokResponse(value: unknown): value is OtokResponse;
export type InferLoaderData<T extends OtokLoader> = Awaited<ReturnType<T>>;
export type InferIslandProps<T> = T extends ComponentType<infer Props> ? Props extends IslandProps ? Props : never : never;
//# sourceMappingURL=routes.d.ts.map
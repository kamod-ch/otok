import type { Context } from "hono";
import type { ComponentType } from "preact";
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
export interface RouteModule<Data extends LoaderResult = LoaderResult> {
    default: ComponentType<OtokPageProps<Data>>;
    loader?: OtokLoader<Data>;
    head?: (props: OtokPageProps<Data>) => OtokHead | Promise<OtokHead>;
}
export interface OtokRoute {
    id: string;
    path: string;
    pattern: RegExp;
    params: string[];
    module: RouteModule;
}
export interface OtokHead {
    title?: string;
    description?: string;
    lang?: string;
    meta?: Record<string, string>;
}
export type InferLoaderData<T extends OtokLoader> = Awaited<ReturnType<T>>;
export type InferIslandProps<T> = T extends ComponentType<infer Props> ? Props extends IslandProps ? Props : never : never;
//# sourceMappingURL=routes.d.ts.map
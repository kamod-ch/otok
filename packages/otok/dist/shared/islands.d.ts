import type { ComponentType } from "preact";
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | {
    [key: string]: JsonValue;
};
export type IslandProps = Record<string, JsonValue>;
export interface IslandModule<Props extends IslandProps = IslandProps> {
    default?: ComponentType<Props>;
    [exportName: string]: unknown;
}
export type IslandLoader<Props extends IslandProps = IslandProps> = () => Promise<IslandModule<Props>>;
export type IslandRegistry = Record<string, IslandLoader>;
export interface IslandManifestEntry {
    id: string;
    file: string;
    exportName: string;
    importPath: string;
}
export declare function encodeIslandProps(props: IslandProps | undefined): string;
export declare function decodeIslandProps(value: string | null): IslandProps;
export declare function resolveIslandId(component: ComponentType<IslandProps>, explicitId?: string): string;
//# sourceMappingURL=islands.d.ts.map
import type { ComponentType } from "preact";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

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

export function encodeIslandProps(props: IslandProps | undefined): string {
  if (!props || Object.keys(props).length === 0) return "";
  const json = JSON.stringify(props);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(json, "utf8").toString("base64url");
  }
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function decodeIslandProps(value: string | null): IslandProps {
  if (!value) return {};
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  if (typeof Buffer !== "undefined") {
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as IslandProps;
  }
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as IslandProps;
}

export function resolveIslandId(component: ComponentType<IslandProps>, explicitId?: string): string {
  if (explicitId) return explicitId;
  const named = component as ComponentType<IslandProps> & {
    displayName?: string;
    name?: string;
    __otokIslandId?: string;
  };
  return named.__otokIslandId ?? named.displayName ?? named.name ?? "";
}

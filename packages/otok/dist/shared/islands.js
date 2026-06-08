export function encodeIslandProps(props) {
    if (!props || Object.keys(props).length === 0)
        return "";
    const json = JSON.stringify(props);
    if (typeof Buffer !== "undefined") {
        return Buffer.from(json, "utf8").toString("base64url");
    }
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    for (const byte of bytes)
        binary += String.fromCharCode(byte);
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
export function decodeIslandProps(value) {
    if (!value)
        return {};
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    if (typeof Buffer !== "undefined") {
        return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    }
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
}
export function resolveIslandId(component, explicitId) {
    if (explicitId)
        return explicitId;
    const named = component;
    return named.__otokIslandId ?? named.displayName ?? named.name ?? "";
}
//# sourceMappingURL=islands.js.map
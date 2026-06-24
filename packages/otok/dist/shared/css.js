/** Escape a string for use inside a CSS attribute selector ([attr="…"]). */
export function cssEscape(value) {
    if (typeof CSS !== "undefined" && CSS.escape)
        return CSS.escape(value);
    return value.replaceAll('"', '\\"').replaceAll("\\", "\\\\");
}
//# sourceMappingURL=css.js.map
import { jsxs as _jsxs, jsx as _jsx } from "preact/jsx-runtime";
import renderToString from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { Island } from "./index.js";
function Counter({ init }) {
    return _jsxs("button", { children: ["Count: ", init] });
}
describe("Island", () => {
    it("renders an SSR marker with encoded props", () => {
        const html = renderToString(_jsx(Island, { component: Counter, props: { init: 7 } }));
        expect(html).toContain('data-otok-island="Counter"');
        expect(html).toContain("data-otok-props=");
        expect(html).toContain("Count: 7");
    });
});
//# sourceMappingURL=island.test.js.map
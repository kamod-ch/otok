import { describe, expect, it } from "vitest";
import { matchRoute } from "./router.js";
const component = () => null;
describe("matchRoute", () => {
    const routes = [
        {
            id: "users.[id]",
            path: "/users/:id",
            pattern: /^\/users\/([^/]+)\/?$/,
            params: ["id"],
            module: { default: component },
        },
        {
            id: "index",
            path: "/",
            pattern: /^\/\/?$/,
            params: [],
            module: { default: component },
        },
    ];
    it("matches dynamic params", () => {
        expect(matchRoute(routes, "/users/alice")?.params).toEqual({ id: "alice" });
    });
    it("returns undefined for missing routes", () => {
        expect(matchRoute(routes, "/missing")).toBeUndefined();
    });
});
//# sourceMappingURL=router.test.js.map
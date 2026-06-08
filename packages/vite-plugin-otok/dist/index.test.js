import { describe, expect, it } from "vitest";
import otok from "./index.js";
describe("otok vite plugin", () => {
    it("registers the expected plugin name", () => {
        const plugin = otok();
        expect(plugin.name).toBe("otok");
        expect(plugin.enforce).toBe("pre");
    });
});
//# sourceMappingURL=index.test.js.map
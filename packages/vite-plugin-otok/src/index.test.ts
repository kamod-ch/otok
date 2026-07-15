import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import otok, { __testing } from "./index.js";

function withFixture(files: Record<string, string>, test: (root: string) => void) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "otok-plugin-"));
  try {
    for (const [file, contents] of Object.entries(files)) {
      const target = path.join(root, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, contents);
    }
    test(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

describe("otok vite plugin", () => {
  it("registers the expected plugin name", () => {
    const plugin = otok();

    expect(plugin.name).toBe("otok");
    expect(plugin.enforce).toBe("pre");
  });

  it("scans layouts, special routes, and advanced route segments", () => {
    withFixture(
      {
        "src/app/routes/_layout.tsx": "export default function Layout() {}",
        "src/app/routes/_middleware.ts": "export default async function RootMiddleware(_c, next) { await next(); }",
        "src/app/routes/admin/_middleware.ts": "export default async function AdminMiddleware(_c, next) { await next(); }",
        "src/app/routes/_not-found.tsx": "export default function NotFound() {}",
        "src/app/routes/_error.tsx": "export default function ErrorRoute() {}",
        "src/app/routes/index.tsx": "export default function Home() {}",
        "src/app/routes/users/[id].tsx": "export default function User() {}",
        "src/app/routes/admin/users/[id].tsx": "export default function AdminUser() {}",
        "src/app/routes/docs/[...slug].tsx": "export default function Docs() {}",
        "src/app/routes/(marketing)/[[lang]]/about.tsx": "export default function About() {}",
      },
      (root) => {
        const scan = __testing.scanRoutes(root, "src/app/routes");

        expect(scan.notFoundRoute?.file).toContain("_not-found.tsx");
        expect(scan.errorRoute?.file).toContain("_error.tsx");
        expect(scan.routes.map((route) => route.routePath)).toEqual(
          expect.arrayContaining(["/", "/users/:id", "/admin/users/:id", "/docs/:slug*", "/about", "/:lang/about"]),
        );
        expect(scan.routes.find((route) => route.routePath === "/users/:id")?.layouts).toHaveLength(1);
        expect(scan.routes.find((route) => route.routePath === "/users/:id")?.middleware).toHaveLength(1);
        expect(scan.routes.find((route) => route.routePath === "/admin/users/:id")?.middleware).toHaveLength(2);
      },
    );
  });

  it("generates special route exports", () => {
    withFixture(
      {
        "src/app/routes/_middleware.ts": "export default async function Middleware(_c, next) { await next(); }",
        "src/app/routes/_not-found.tsx": "export default function NotFound() {}",
        "src/app/routes/_error.tsx": "export default function ErrorRoute() {}",
        "src/app/routes/index.tsx": "export default function Home() {}",
      },
      (root) => {
        const code = __testing.generateRoutesModule(__testing.scanRoutes(root, "src/app/routes"));

        expect(code).toContain("export const routes");
        expect(code).toContain("export const routePaths =");
        expect(code).not.toContain("as const");
        expect(code).not.toContain("export type OtokRoutePath");
        expect(code).toContain('"/"');
        expect(code).not.toContain('"/_not-found"');
        expect(code).not.toContain('"/_error"');
        expect(code).toContain("export const notFoundRoute");
        expect(code).toContain("export const errorRoute");
        expect(code).toContain("import * as middleware0");
        expect(code).toContain("middleware: [middleware0]");
      },
    );
  });

  it("injects stable island ids into default function exports", () => {
    expect(
      __testing.injectIslandId("export default function Counter() { return null; }", "Counter"),
    ).toContain('Counter.__otokIslandId = "Counter"');
  });

  it("injects stable island ids into anonymous default exports", () => {
    const code = __testing.injectIslandId("export default () => null;", "Counter");

    expect(code).toContain("const __OtokDefaultIsland =");
    expect(code).toContain('export default __OtokDefaultIsland');
  });
});

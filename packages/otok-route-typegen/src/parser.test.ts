import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scanRoutes, segmentToVariants } from "./parser.js";
import { detectRouteConflicts } from "./conflicts.js";
import { generateRouteTypes } from "./generate.js";
import { formatRouteTree } from "./tree.js";

function withFixture(files: Record<string, string>, test: (root: string) => void) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "otok-route-typegen-"));
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

describe("segmentToVariants", () => {
  it("parses dynamic, optional, and catch-all segments", () => {
    const base = [{ parts: [], params: [], staticCount: 0, dynamicCount: 0, catchAllCount: 0, optionalCount: 0 }];
    expect(segmentToVariants("[id]", base)).toHaveLength(1);
    expect(segmentToVariants("[[lang]]", base)).toHaveLength(2);
    expect(segmentToVariants("[...slug]", base)).toHaveLength(1);
  });
});

describe("scanRoutes", () => {
  it("collects nested dynamic routes", () => {
    withFixture(
      {
        "src/app/routes/index.tsx": "export default function Home() {}",
        "src/app/routes/companies/[companyId]/index.tsx": "export default function Company() {}",
        "src/app/routes/docs/[...slug].tsx": "export default function Docs() {}",
      },
      (root) => {
        const scan = scanRoutes({ root, routesDir: "src/app/routes" });
        expect(scan.routes.map((route) => route.routePattern)).toEqual(
          expect.arrayContaining(["/", "/companies/[companyId]", "/docs/[...slug]"]),
        );
      },
    );
  });
});

describe("detectRouteConflicts", () => {
  it("reports duplicate resolved paths from different files", () => {
    withFixture(
      {
        "src/app/routes/about.tsx": "export default function About() {}",
        "src/app/routes/(marketing)/about.tsx": "export default function AboutMarketing() {}",
      },
      (root) => {
        const scan = scanRoutes({ root, routesDir: "src/app/routes" });
        const issues = detectRouteConflicts(scan.routes);
        expect(issues.some((issue) => issue.code === "ROUTE_CONFLICT")).toBe(true);
      },
    );
  });
});

describe("generateRouteTypes", () => {
  it("writes stable generated files", () => {
    withFixture(
      {
        "src/app/routes/companies/[companyId].tsx": `
          import { defineLoader } from "@kamod-ch/otok/route";
          export const loader = defineLoader(async ({ params }) => ({ company: { id: params.companyId, name: "Acme" } }));
          export default function CompanyPage({ loaderData }: Route.ComponentProps) {
            return loaderData.company.name;
          }
        `,
      },
      (root) => {
        const scan = scanRoutes({ root, routesDir: "src/app/routes" });
        const first = generateRouteTypes(scan, { root, outputDir: ".otok/types", strict: false });
        const second = generateRouteTypes(scan, { root, outputDir: ".otok/types", strict: false });

        expect(first.changed).toBe(true);
        expect(second.changed).toBe(false);
        expect(fs.existsSync(path.join(root, ".otok/types/manifest.d.ts"))).toBe(true);
        expect(fs.existsSync(path.join(root, ".otok/types/src/app/routes/companies/[companyId].d.ts"))).toBe(true);
      },
    );
  });
});

describe("formatRouteTree", () => {
  it("renders a readable tree", () => {
    withFixture(
      {
        "src/app/routes/index.tsx": "export default function Home() {}",
        "src/app/routes/users/[id].tsx": "export default function User() {}",
      },
      (root) => {
        const scan = scanRoutes({ root, routesDir: "src/app/routes" });
        const tree = formatRouteTree(scan);
        expect(tree).toContain("Route tree");
        expect(tree).toContain("users");
        expect(tree).toContain("[id]");
      },
    );
  });
});

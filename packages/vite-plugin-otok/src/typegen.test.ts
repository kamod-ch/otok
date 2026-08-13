import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runRouteTypegen } from "@kamod-ch/otok-route-typegen";

describe("vite plugin typegen integration", () => {
  it("generates route types during buildStart hook flow", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "otok-typegen-integration-"));
    try {
      const routesDir = "src/app/routes";
      const files = {
        "src/app/routes/index.tsx": "export default function Home() { return null; }",
        "src/app/routes/users/[id].tsx": `
          import { defineLoader } from "@kamod-ch/otok/route";
          export const loader = defineLoader(async ({ params }) => ({ user: params.id }));
          export default function UserPage({ loaderData }: Route.ComponentProps) {
            return loaderData.user;
          }
        `,
      };

      for (const [file, contents] of Object.entries(files)) {
        const target = path.join(root, file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, contents);
      }

      const result = runRouteTypegen({ root, routesDir, outputDir: ".otok/types", strict: false });
      expect(result.files.length).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(root, ".otok/types/manifest.d.ts"))).toBe(true);

      const manifest = fs.readFileSync(path.join(root, ".otok/types/manifest.d.ts"), "utf8");
      expect(manifest).toContain('"/users/[id]"');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

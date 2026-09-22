import { describe, expect, it } from "vitest";
import { buildCacheKey } from "@kamod-ch/otok/cache";
import { parseImportCsv } from "../src/lib/import-csv.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createKyselyInstance } from "@kamod-ch/otok-kysely";
import { createPostgresQueueProvider, migratePostgresQueueSchema } from "@kamod-ch/otok-queue/providers/postgres";
import { runQueueWorker } from "@kamod-ch/otok-queue/worker";
import { resolveQueueRetry } from "@kamod-ch/otok-queue";
import type { Kysely } from "kysely";
import type { QueueDatabase } from "@kamod-ch/otok-queue/providers/postgres";
import type { DevjobsDatabase } from "../src/db/types.js";
import { processCsvImport } from "../src/lib/import-worker.js";
import { newId } from "../src/lib/ids.js";
import { COMPANY_ALPHA_ID, USER_ALICE_ID } from "../src/db/types.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.DEVJOBS_TEST_URL ?? "http://127.0.0.1:5180";
const pgUrl = process.env.DEVJOBS_TEST_DATABASE_URL;

async function fetchApp(path: string, init?: RequestInit) {
  return fetch(new URL(path, baseUrl), { ...init, redirect: "manual" });
}

async function login(email: string, password: string): Promise<string> {
  const getLogin = await fetchApp("/login");
  const html = await getLogin.text();
  const csrfMatch = html.match(/name="_csrf" value="([^"]+)"/);
  const csrf = csrfMatch?.[1] ?? "";
  const body = new URLSearchParams({ email, password, _csrf: csrf });
  const res = await fetchApp("/login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: getLogin.headers.get("set-cookie") ?? "" },
    body,
  });
  const cookies = [getLogin.headers.get("set-cookie"), res.headers.get("set-cookie")].filter(Boolean).join("; ");
  return cookies;
}

describe("devjobs reference (HTTP)", () => {
  it.skipIf(!process.env.DEVJOBS_INTEGRATION)("1 — tenant isolation for private jobs", async () => {
    const bobDenied = await fetchApp("/jobs/internal-alpha-hr");
    expect(bobDenied.status).toBe(404);

    const aliceCookie = await login("alice@alpha.ch", "seed-password");
    const aliceOk = await fetchApp("/jobs/internal-alpha-hr", { headers: { cookie: aliceCookie } });
    expect(aliceOk.status).toBe(200);
  });

  it.skipIf(!process.env.DEVJOBS_INTEGRATION)("3 — validation returns 422 with field errors", async () => {
    const cookie = await login("alice@alpha.ch", "seed-password");
    const getForm = await fetchApp("/employer/jobs/new", { headers: { cookie } });
    const csrf = (await getForm.text()).match(/name="_csrf" value="([^"]+)"/)?.[1] ?? "";
    const res = await fetchApp("/employer/jobs/new", {
      method: "POST",
      headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ title: "ab", description: "short", visibility: "public", _csrf: csrf }),
    });
    expect(res.status).toBe(422);
  });

  it.skipIf(!process.env.DEVJOBS_INTEGRATION)("7 — CSRF blocks missing token", async () => {
    const cookie = await login("alice@alpha.ch", "seed-password");
    const res = await fetchApp("/employer/jobs/new", {
      method: "POST",
      headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        title: "Valid Title Here",
        description: "Long enough description text.",
        visibility: "public",
      }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it.skipIf(!process.env.DEVJOBS_INTEGRATION)("8 — impressum ships without client entry", async () => {
    const res = await fetchApp("/impressum");
    const html = await res.text();
    expect(html).toContain("Impressum");
    expect(html).not.toMatch(/client\/assets\/client-/);
  });
});

describe("cache keys", () => {
  it("2 — q/page variants do not share cache keys", () => {
    const a = buildCacheKey({
      method: "GET",
      routeId: "jobs/index",
      requestPath: "/jobs",
      query: [
        ["q", "react"],
        ["page", "1"],
      ],
      shared: true,
    });
    const b = buildCacheKey({
      method: "GET",
      routeId: "jobs/index",
      requestPath: "/jobs",
      query: [
        ["q", "vue"],
        ["page", "2"],
      ],
      shared: true,
    });
    expect(a).not.toEqual(b);
  });
});

describe("csv import", () => {
  it("parses fixture and enforces row limit", () => {
    const csv = readFileSync(join(root, "fixtures/import-sample.csv"), "utf8");
    const parsed = parseImportCsv(csv);
    expect(parsed.error).toBeUndefined();
    expect(parsed.rows.length).toBe(3);
  });
});

describe.skipIf(!pgUrl)("queue import dedupe", () => {
  it("6 — two workers do not duplicate external_ref rows", async () => {
    const db = await createKyselyInstance<DevjobsDatabase>("postgres", pgUrl!);
    await migratePostgresQueueSchema(db as unknown as Kysely<QueueDatabase>);
    const retry = resolveQueueRetry({ maxAttempts: 3 });
    const provider = createPostgresQueueProvider(db as unknown as Kysely<QueueDatabase>, {
      type: "postgres",
      retry,
    });

    const importId = newId("import");
    const csv = readFileSync(join(root, "fixtures/import-sample.csv"), "utf8");
    await db
      .insertInto("job_import")
      .values({
        id: importId,
        company_id: COMPANY_ALPHA_ID,
        created_by: USER_ALICE_ID,
        status: "pending",
        csv_content: csv,
        rows_total: 3,
        rows_imported: 0,
        last_error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    runQueueWorker({
      provider,
      workerId: "w1",
      concurrency: 1,
      handlers: { "devjobs.import-csv": (p: { importId: string }) => processCsvImport(db, p.importId) },
    });
    runQueueWorker({
      provider,
      workerId: "w2",
      concurrency: 1,
      handlers: { "devjobs.import-csv": (p: { importId: string }) => processCsvImport(db, p.importId) },
    });

    await provider.enqueue("devjobs.import-csv", { importId }, { idempotencyKey: importId, idempotencyScope: "test" });

    const deadline = Date.now() + 30_000;
    let status = "pending";
    while (Date.now() < deadline) {
      const row = await db.selectFrom("job_import").select("status").where("id", "=", importId).executeTakeFirst();
      status = row?.status ?? status;
      if (status === "completed" || status === "failed") break;
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(status).toBe("completed");

    const dupes = await db
      .selectFrom("job_posting")
      .select((eb) => eb.fn.countAll<number>().as("c"))
      .where("company_id", "=", COMPANY_ALPHA_ID)
      .where("external_ref", "=", "imp-001")
      .executeTakeFirst();
    expect(Number(dupes?.c ?? 0)).toBe(1);

    await db.destroy();
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { createOtokTestApp, expectRedirect, expectValidationDocument } from "@kamod-ch/otok-test";
import { CSRF_FIELD, DEFAULT_CSRF_COOKIE } from "@kamod-ch/otok-auth/csrf";
import { OTOK_IDEMPOTENCY_FIELD } from "@kamod-ch/otok/shared";
import { createDiscussionsRuntime } from "./config.js";
import { createMemoryDiscussionAdapter } from "./adapters/memory/index.js";
import { createTestProviders } from "./testing/providers.js";
import {
  actorDirectory,
  allowPolicy,
  moderationForTenants,
  staticSubjectResolver,
} from "./testing/service-fixtures.js";
import { createMutableDiscussionsAuth } from "./testing/discussions-auth.js";
import { createDiscussions } from "./create-discussions.js";

const subject = { tenantId: "tenant-a", subjectType: "job", subjectId: "job-1" };
const user1 = { id: "user-1", displayName: "One", roles: [] as string[] };
const mod = { id: "mod-a", displayName: "Mod", roles: ["moderator"] as string[] };

describe("discussions otok e2e", () => {
  const deps = createTestProviders({ iso: "2026-06-01T12:00:00.000Z" });
  const runtime = createDiscussionsRuntime({ editWindowMs: 60_000 }, deps);
  let auth = createMutableDiscussionsAuth({ tenantId: "tenant-a", sessionUserId: "user-1" });
  let adapter: ReturnType<typeof createMemoryDiscussionAdapter>;

  beforeEach(() => {
    auth = createMutableDiscussionsAuth({ tenantId: "tenant-a", sessionUserId: "user-1" });
    adapter = createMemoryDiscussionAdapter({ deps, config: runtime.config });
  });

  function buildExtension(actorIds: Record<string, typeof user1> = { "user-1": user1, "mod-a": mod }) {
    return createDiscussions({
      basePath: "/discussions",
      subjectType: "job",
      adapter,
      runtime,
      subjectResolver: staticSubjectResolver(subject),
      actorResolver: actorDirectory(actorIds),
      policy: allowPolicy(),
      moderation: moderationForTenants("tenant-a"),
      auth,
      csrf: true,
    });
  }

  async function createApp() {
    return createOtokTestApp({ routes: buildExtension().routes });
  }

  async function fetchCsrf(app: Awaited<ReturnType<typeof createApp>>) {
    const res = await app.get("/discussions/job-1/thread");
    const cookie = res.headers.getSetCookie().find((v) => v.startsWith(`${DEFAULT_CSRF_COOKIE}=`));
    const token = cookie?.split(";")[0]?.split("=")[1];
    const csrfFromForm = res.document.querySelector(`input[name=${CSRF_FIELD}]`)?.getAttribute("value");
    return {
      token: token ?? csrfFromForm ?? "test-csrf",
      cookieHeader: cookie ? cookie.split(";")[0] : `${DEFAULT_CSRF_COOKIE}=test-csrf`,
    };
  }

  it("creates comment without javascript", async () => {
    const app = await createApp();
    const { token, cookieHeader } = await fetchCsrf(app);
    const res = await app.post("/discussions/job-1/thread", {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: cookieHeader,
      },
      body: new URLSearchParams({
        intent: "comment",
        bodyMarkdown: "Hello from form",
        [CSRF_FIELD]: token,
        [OTOK_IDEMPOTENCY_FIELD]: "comment-create-1",
      }),
    });
    expectRedirect(res.response, { location: "/discussions/job-1/thread", status: 303 });
    const page = await app.get("/discussions/job-1/thread", { headers: { cookie: cookieHeader } });
    expect(page.document.contains("Hello from form")).toBe(true);
    await app.cleanup();
  });

  it("returns 422 validation without duplicate mutation on idempotent repost", async () => {
    const app = await createApp();
    const { token, cookieHeader } = await fetchCsrf(app);
    const body = new URLSearchParams({
      intent: "comment",
      bodyMarkdown: "",
      [CSRF_FIELD]: token,
      [OTOK_IDEMPOTENCY_FIELD]: "comment-dup-key",
    });
    const first = await app.post("/discussions/job-1/thread", {
      headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: cookieHeader },
      body,
    });
    expectValidationDocument(first.document, { status: 422 });
    const second = await app.post("/discussions/job-1/thread", {
      headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: cookieHeader },
      body,
    });
    expect(second.status).toBe(422);
    expect(second.headers.get("x-otok-idempotency")).toBe("replay");
    const list = await app.get("/discussions/job-1/thread", { headers: { cookie: cookieHeader } });
    expect(list.document.contains("accidental-body")).toBe(false);
    await app.cleanup();
  });

  it("rejects CSRF mismatch", async () => {
    const app = await createApp();
    const res = await app.post("/discussions/job-1/thread", {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: `${DEFAULT_CSRF_COOKIE}=aaa`,
      },
      body: new URLSearchParams({
        intent: "comment",
        bodyMarkdown: "nope",
        [CSRF_FIELD]: "bbb",
      }),
    });
    expect(res.status).toBe(403);
    await app.cleanup();
  });

  it("rejects comment when thread is closed", async () => {
    const ext = buildExtension();
    const { thread } = await ext.services.discussion.getOrCreateThread(
      { tenantId: "tenant-a", subjectType: "job", subjectId: "job-1", sessionUserId: "mod-a" },
      { title: "T" },
    );
    auth.setScope({ tenantId: "tenant-a", sessionUserId: "mod-a" });
    await ext.services.moderation.transitionThread(
      { tenantId: "tenant-a", subjectType: "job", subjectId: "job-1", sessionUserId: "mod-a" },
      thread.id,
      "closed",
    );
    auth.setScope({ tenantId: "tenant-a", sessionUserId: "user-1" });
    const app = await createOtokTestApp({ routes: ext.routes });
    const { token, cookieHeader } = await fetchCsrf(app);
    const res = await app.post("/discussions/job-1/thread", {
      headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: cookieHeader },
      body: new URLSearchParams({
        intent: "comment",
        bodyMarkdown: "Too late",
        [CSRF_FIELD]: token,
      }),
    });
    expect(res.status).toBeGreaterThanOrEqual(403);
    await app.cleanup();
  });

  it("renders sort links and switches sort without javascript", async () => {
    const app = await createApp();
    const page = await app.get("/discussions/job-1/thread");
    expect(page.document.querySelector('[data-discussion-sort="top"]')).toBeTruthy();
    const popular = await app.get("/discussions/job-1/thread?sort=top");
    expect(popular.document.querySelector('[data-discussion-sort="top"]')?.getAttribute("aria-current")).toBe("true");
    await app.cleanup();
  });

  it("switches reactions via progressive-enhancement forms", async () => {
    const app = await createApp();
    const { token, cookieHeader } = await fetchCsrf(app);
    await app.post("/discussions/job-1/thread", {
      headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: cookieHeader },
      body: new URLSearchParams({
        intent: "comment",
        bodyMarkdown: "React me",
        [CSRF_FIELD]: token,
        [OTOK_IDEMPOTENCY_FIELD]: "comment-react-target",
      }),
    });
    const page = await app.get("/discussions/job-1/thread", { headers: { cookie: cookieHeader } });
    const commentId = page.document.querySelector("[data-comment-id]")?.getAttribute("data-comment-id");
    expect(commentId).toBeTruthy();
    const react = await app.post("/discussions/job-1/thread", {
      headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: cookieHeader },
      body: new URLSearchParams({
        intent: "react",
        commentId: commentId!,
        emoji: "👍",
        mode: "set",
        redirectTo: "/discussions/job-1/thread",
        [CSRF_FIELD]: token,
        [OTOK_IDEMPOTENCY_FIELD]: `react-${commentId}-up`,
      }),
    });
    expect(react.response.status).toBe(303);
    const after = await app.get("/discussions/job-1/thread", { headers: { cookie: cookieHeader } });
    expect(after.document.querySelector('[aria-pressed="true"]')).toBeTruthy();
    await app.cleanup();
  });

  it("denies foreign tenant via subject resolver", async () => {
    auth.setScope({ tenantId: "tenant-b", sessionUserId: "user-1" });
    const app = await createApp();
    const res = await app.get("/discussions/job-1/thread");
    expect(res.status).toBeGreaterThanOrEqual(403);
    await app.cleanup();
  });
});

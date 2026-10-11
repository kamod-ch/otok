import { Hono, type Context } from "hono";
import type { WorkflowEngine, WorkflowInstance, WorkflowStatus, WorkflowStore } from "@kamod-ch/otok-workflows";
import { WorkflowException } from "@kamod-ch/otok-workflows";
import { hasPermission, parseSessionCookie, sessionCookieName, encodeSession } from "./auth/session.js";
import { AuditLog } from "./audit.js";
import { csrfMiddleware, csrfToken, CSRF_FIELD } from "./csrf.js";
import { toDetail, toListItem, toStepItem } from "./dto/redact.js";
import { detailPage, listPage, loginPage } from "./html/layout.js";
import { IdempotencyStore } from "./idempotency.js";
import { actionConflictReason } from "./state-matrix.js";
import { DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT, type OperatorSession } from "./types.js";
import { setCookie } from "hono/cookie";

export interface WorkflowOpsDeps {
  store: WorkflowStore;
  engine: WorkflowEngine;
  sessionSecret: string;
  operatorPassword: string;
  now?: () => Date;
  audit?: AuditLog;
  idempotency?: IdempotencyStore;
  /** Test-only: bypass cookie auth when header present */
  allowTestSessionHeader?: boolean;
}

function wantsJson(c: { req: { header: (n: string) => string | undefined } }): boolean {
  const accept = c.req.header("accept") ?? "";
  return accept.includes("application/json");
}

function parseLimit(raw: string | undefined): number | "invalid" {
  if (raw === undefined || raw === "") return DEFAULT_LIST_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return "invalid";
  if (n > MAX_LIST_LIMIT) return "invalid";
  return n;
}

export function createWorkflowOpsApp(deps: WorkflowOpsDeps): Hono {
  const app = new Hono();
  const audit = deps.audit ?? new AuditLog();
  const idempotency = deps.idempotency ?? new IdempotencyStore();
  const now = deps.now ?? (() => new Date());

  app.use("*", csrfMiddleware());

  async function resolveSession(c: {
    req: { header: (n: string) => string | undefined; raw: Request };
  }): Promise<OperatorSession | null> {
    if (deps.allowTestSessionHeader) {
      const test = c.req.header("x-ops-test-session");
      if (test) {
        try {
          return JSON.parse(test) as OperatorSession;
        } catch {
          return null;
        }
      }
    }
    return parseSessionCookie(c.req.header("cookie"), deps.sessionSecret);
  }

  function requireAuth(session: OperatorSession | null): OperatorSession | Response {
    if (!session) return new Response("Unauthorized", { status: 401 });
    return session;
  }

  function requirePerm(
    session: OperatorSession,
    perm: "workflow:read" | "workflow:operate" | "workflow:audit",
  ): Response | null {
    if (!hasPermission(session, perm)) return new Response("Forbidden", { status: 403 });
    return null;
  }

  app.get("/login", async (c) => c.html(loginPage(csrfToken(c))));

  app.post("/login", async (c) => {
    const body = await c.req.parseBody();
    const password = body.password;
    if (password !== deps.operatorPassword) {
      return c.html(loginPage(csrfToken(c), "Invalid credentials"), 401);
    }
    const session: OperatorSession = {
      operatorId: "operator",
      permissions: ["workflow:read", "workflow:operate", "workflow:audit"],
    };
    setCookie(c, sessionCookieName(), encodeSession(session, deps.sessionSecret), {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
    });
    return c.redirect("/ops/workflows/instances", 303);
  });

  app.get("/ops/workflows/instances", async (c) => {
    const session = requireAuth(await resolveSession(c));
    if (session instanceof Response) return session;
    const denied = requirePerm(session, "workflow:read");
    if (denied) return denied;

    const limit = parseLimit(c.req.query("limit"));
    if (limit === "invalid") return c.text("Invalid limit", 400);

    const status = c.req.query("status") as WorkflowStatus | undefined;
    const workflowName = c.req.query("workflowName")?.trim() || undefined;

    let list = await deps.store.listInstances({
      status,
      workflowName,
      limit: MAX_LIST_LIMIT,
    });
    list = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
    const items = list.map(toListItem);

    if (wantsJson(c)) return c.json({ instances: items });
    return c.html(listPage(items, { status, workflowName, limit }, csrfToken(c)));
  });

  app.get("/ops/workflows/instances/:id", async (c) => {
    const session = requireAuth(await resolveSession(c));
    if (session instanceof Response) return session;
    const denied = requirePerm(session, "workflow:read");
    if (denied) return denied;

    const id = c.req.param("id");
    const instance = await deps.store.getInstance(id);
    if (!instance) return c.text("Not found", 404);

    const includeSecrets = c.req.query("includeSecrets") === "1";
    if (includeSecrets) {
      const auditDenied = requirePerm(session, "workflow:audit");
      if (auditDenied) return auditDenied;
    }

    const steps = (await deps.store.listSteps(id)).map(toStepItem);
    const detail = toDetail(instance, includeSecrets);
    const flash = c.req.query("flash");

    if (wantsJson(c)) return c.json({ instance: detail, steps });
    return c.html(detailPage(detail, steps, instance, now(), csrfToken(c), flash));
  });

  async function mutate(
    c: Context,
    action: "pause" | "resume" | "approve" | "cancel",
    run: (instance: WorkflowInstance) => Promise<void>,
    confirm?: string,
  ) {
    const session = requireAuth(await resolveSession(c));
    if (session instanceof Response) return session;
    const denied = requirePerm(session, "workflow:operate");
    if (denied) return denied;

    const id = c.req.param("id");
    if (!id) return c.text("Bad request", 400);
    const idempotencyKey = c.req.header("idempotency-key");
    if (idempotencyKey) {
      const replay = idempotency.get(session.operatorId, idempotencyKey, action, id);
      if (replay) return c.redirect(replay, 303);
    }

    const instance = await deps.store.getInstance(id);
    if (!instance) {
      audit.record({ operatorId: session.operatorId, instanceId: id, action, result: "error", detail: "404" });
      return c.text("Not found", 404);
    }

    if (confirm) {
      const body = await c.req.parseBody();
      if (body.confirm !== confirm) {
        audit.record({ operatorId: session.operatorId, instanceId: id, action, result: "denied", detail: "confirm" });
        return c.text("Confirmation required", 409);
      }
    }

    const conflict = actionConflictReason(action, instance, now());
    if (conflict) {
      audit.record({ operatorId: session.operatorId, instanceId: id, action, result: "denied", detail: conflict });
      return c.text(conflict, 409);
    }

    try {
      await run(instance);
    } catch (error) {
      const detail = error instanceof WorkflowException ? error.code : "error";
      audit.record({ operatorId: session.operatorId, instanceId: id, action, result: "error", detail });
      if (error instanceof WorkflowException && error.code === "NOT_FOUND") {
        return c.text("Worker holds lease or instance conflict", 409);
      }
      throw error;
    }

    audit.record({ operatorId: session.operatorId, instanceId: id, action, result: "ok" });
    const location = `/ops/workflows/instances/${id}?flash=${action}-ok`;
    if (idempotencyKey) idempotency.set(session.operatorId, idempotencyKey, action, id, location);
    return c.redirect(location, 303);
  }

  app.post("/ops/workflows/instances/:id/pause", (c) =>
    mutate(c, "pause", async () => {
      await deps.engine.pause(c.req.param("id"));
    }),
  );

  app.post("/ops/workflows/instances/:id/resume", (c) =>
    mutate(c, "resume", async () => {
      await deps.engine.resume(c.req.param("id"));
    }),
  );

  app.post("/ops/workflows/instances/:id/approve", (c) =>
    mutate(
      c,
      "approve",
      async () => {
        await deps.engine.resume(c.req.param("id"));
      },
      "approve",
    ),
  );

  app.post("/ops/workflows/instances/:id/cancel", (c) =>
    mutate(
      c,
      "cancel",
      async () => {
        await deps.engine.cancel(c.req.param("id"));
      },
      "cancel",
    ),
  );

  return app;
}

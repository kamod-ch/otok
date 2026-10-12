import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import type { OtokActionContext } from "@kamod-ch/otok/server";
import type { SupabaseEnv } from "../types.js";
import { signInWithPasswordAction, signUpAction, updatePasswordAction } from "./actions.js";

type FakeClient = ReturnType<typeof createFakeClient>;

function createFakeClient() {
  return {
    auth: {
      signInWithPassword: vi.fn(async () => ({ data: { user: { id: "user-1" } }, error: null })),
      signUp: vi.fn(async () => ({ data: { user: { id: "user-1" } }, error: null })),
      updateUser: vi.fn(async () => ({ data: { user: { id: "user-1" } }, error: null })),
    },
  };
}

async function runPasswordAction(
  action: (ctx: OtokActionContext) => Promise<unknown>,
  fields: Record<string, string | File>,
  options?: { dataRequest?: boolean },
): Promise<{ outcome?: unknown; error?: unknown; client: FakeClient }> {
  const client = createFakeClient();
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }

  const app = new Hono<SupabaseEnv>();
  app.post("/action", async (c) => {
    c.set("supabase", client as unknown as SupabaseEnv["Variables"]["supabase"]);
    const ctx: OtokActionContext = {
      hono: c as OtokActionContext["hono"],
      request: new Request(c.req.url, {
        method: "POST",
        headers: options?.dataRequest ? { "x-otok-data": "1" } : {},
        body: formData,
      }),
      formData,
      params: {},
      route: "/action",
      signal: c.req.raw.signal,
      method: "POST",
    };
    try {
      const outcome = await action(ctx);
      return c.json({ ok: true, outcome });
    } catch (error) {
      return c.json({ ok: false, error: { message: error instanceof Error ? error.message : String(error) } });
    }
  });

  const response = await app.request("/action", { method: "POST", body: formData });
  const payload = (await response.json()) as { ok: boolean; outcome?: unknown; error?: unknown };
  if (!payload.ok) {
    return { error: payload.error, client };
  }
  return { outcome: payload.outcome, client };
}

describe("supabase password actions", () => {
  const spacedPassword = "  valid password  ";

  it.each([
    ["signInWithPasswordAction", signInWithPasswordAction(), "signInWithPassword"] as const,
    ["signUpAction", signUpAction(), "signUp"] as const,
    ["updatePasswordAction", updatePasswordAction(), "updateUser"] as const,
  ])("%s forwards password bytes unchanged", async (_label, action, method) => {
    const { outcome, client } = await runPasswordAction(
      action,
      {
        email: "  user@example.com  ",
        password: spacedPassword,
      },
      { dataRequest: true },
    );
    expect(outcome).toBeDefined();
    const spy = client.auth[method] as ReturnType<typeof vi.fn>;
    if (method === "updateUser") {
      expect(spy).toHaveBeenCalledWith({ password: spacedPassword });
    } else {
      expect(spy).toHaveBeenCalledWith({ email: "user@example.com", password: spacedPassword });
    }
  });

  it("sign-in returns data-response payload when requested", async () => {
    const { outcome } = await runPasswordAction(
      signInWithPasswordAction({ successRedirect: "/dashboard" }),
      { email: "user@example.com", password: spacedPassword },
      { dataRequest: true },
    );
    expect(outcome).toMatchObject({ ok: true, redirect: "/dashboard" });
  });

  it("rejects missing password without calling provider", async () => {
    const { error, client } = await runPasswordAction(signInWithPasswordAction(), {
      email: "user@example.com",
    });
    expect(error).toBeDefined();
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects empty password without calling provider", async () => {
    const { error, client } = await runPasswordAction(signInWithPasswordAction(), {
      email: "user@example.com",
      password: "",
    });
    expect(error).toBeDefined();
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects file password without calling provider", async () => {
    const { error, client } = await runPasswordAction(signInWithPasswordAction(), {
      email: "user@example.com",
      password: new File(["secret"], "pw.txt"),
    });
    expect(error).toBeDefined();
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("forwards whitespace-only passwords to the provider unchanged", async () => {
    const onlySpaces = "   ";
    const { client } = await runPasswordAction(
      signInWithPasswordAction(),
      {
        email: "user@example.com",
        password: onlySpaces,
      },
      { dataRequest: true },
    );
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: onlySpaces,
    });
  });
});

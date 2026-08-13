import { expectTypeOf, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MockDatabase } from "./test/fixtures.js";
import { supabase } from "./server/middleware.js";
import { requireSupabaseAuth, requireSupabaseUser } from "./auth/middleware.js";

it("types middleware factories with Database generic", () => {
  const middleware = supabase<MockDatabase>({
    url: "https://your-project.supabase.co",
    publishableKey: "test-key",
  });
  expectTypeOf(middleware).toBeFunction();

  expectTypeOf(requireSupabaseAuth<MockDatabase>()).toBeFunction();
  expectTypeOf(requireSupabaseUser<MockDatabase>()).toBeFunction();
});

it("types supabase client tables from Database", () => {
  expectTypeOf<SupabaseClient<MockDatabase>>().toHaveProperty("from");
  type Row = MockDatabase["public"]["Tables"]["projects"]["Row"];
  expectTypeOf<Row>().toEqualTypeOf<{ id: string; name: string }>();
});

it("does not expose admin API from root entry", async () => {
  const root = await import("./index.js");
  expectTypeOf(root).not.toHaveProperty("createOtokSupabaseAdminClient");
});

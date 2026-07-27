import { expectTypeOf, it } from "vitest";
import type { Kysely } from "kysely";
import { defineLoader } from "./loader.js";

interface ContactsDB {
  contacts: { id: number; name: string; email: string };
}

it("defineLoader infers db type", () => {
  defineLoader<{ ok: boolean }, ContactsDB>(async ({ db }) => {
    expectTypeOf(db).toEqualTypeOf<Kysely<ContactsDB>>();
    return { ok: true };
  });
});

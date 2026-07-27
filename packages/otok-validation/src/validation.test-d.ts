import { expectTypeOf, it } from "vitest";
import { z } from "zod";
import { defineAction } from "./loader.js";

const contactSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

it("defineAction infers input type from schema", () => {
  defineAction({
    schema: contactSchema,
    handler: async ({ input }) => {
      expectTypeOf(input).toEqualTypeOf<{ name: string; email: string }>();
      return input;
    },
  });
});

it("defineAction allows optional db type parameter", () => {
  interface ContactsDB {
    contacts: { id: number; name: string; email: string };
  }

  defineAction({
    schema: contactSchema,
    handler: async ({ input, db }) => {
      expectTypeOf(input).toEqualTypeOf<{ name: string; email: string }>();
      if (db) {
        expectTypeOf(db).toEqualTypeOf<ContactsDB>();
      }
      return input;
    },
  });
});

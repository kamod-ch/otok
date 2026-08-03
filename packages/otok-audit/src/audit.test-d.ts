import { expectTypeOf, it } from "vitest";
import type { AuditEntry, RecordAuditInput } from "./types.js";
import { defineAuditAction } from "./define-action.js";
import { companyUpdated } from "./crm/actions.js";

it("defineAuditAction preserves action name type", () => {
  const action = defineAuditAction({
    name: "deal.won",
    resourceType: "deal",
  });
  expectTypeOf(action.name).toEqualTypeOf<"deal.won">();
  expectTypeOf(action.resourceType).toEqualTypeOf<"deal">();
});

it("RecordAuditInput requires action and resource", () => {
  expectTypeOf<RecordAuditInput>().toMatchTypeOf<{
    action: string;
    resource: { type: string; id: string };
  }>();
});

it("crm actions are audit action definitions", () => {
  expectTypeOf(companyUpdated.name).toEqualTypeOf<"company.updated">();
  expectTypeOf<AuditEntry["action"]>().toEqualTypeOf<string>();
});

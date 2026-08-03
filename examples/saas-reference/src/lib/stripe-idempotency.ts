import type { Kysely } from "kysely";
import type { SaasDatabase } from "../db/types.js";

export interface EventIdempotencyStore {
  hasProcessed(eventId: string): Promise<boolean>;
  markProcessed(eventId: string): Promise<void>;
}

export function createKyselyStripeEventStore(db: Kysely<SaasDatabase>): EventIdempotencyStore {
  return {
    async hasProcessed(eventId: string) {
      const row = await db
        .selectFrom("stripe_event")
        .select("event_id")
        .where("event_id", "=", eventId)
        .executeTakeFirst();
      return Boolean(row);
    },
    async markProcessed(eventId: string) {
      await db
        .insertInto("stripe_event")
        .values({ event_id: eventId, processed_at: new Date().toISOString() })
        .onConflict((oc) => oc.column("event_id").doNothing())
        .execute();
    },
  };
}

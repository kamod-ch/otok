import type { Kysely, Transaction } from "kysely";

/**
 * Run a callback inside a database transaction.
 * Rolls back automatically when the callback throws.
 */
export async function withTransaction<DB, T>(
  db: Kysely<DB>,
  callback: (trx: Transaction<DB>) => Promise<T>,
): Promise<T> {
  return db.transaction().execute(callback);
}

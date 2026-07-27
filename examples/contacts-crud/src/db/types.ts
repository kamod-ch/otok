import type { Generated } from "kysely";

export interface ContactsDatabase {
  contacts: ContactsTable;
  otok_migrations: MigrationsTable;
}

export interface ContactsTable {
  id: Generated<number>;
  name: string;
  email: string;
  created_at: Generated<string>;
}

export interface MigrationsTable {
  name: string;
  applied_at: string;
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

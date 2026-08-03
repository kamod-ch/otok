import { Kysely, SqliteDialect } from "kysely";
import Database from "better-sqlite3";
import type { ForumDatabase } from "@otok/forum/kysely";
import { createKyselyForumStorage, migrateForumSchema } from "@otok/forum/kysely";

const sqlite = new Database("forum-demo.sqlite");
const db = new Kysely<ForumDatabase>({ dialect: new SqliteDialect({ database: sqlite }) });
await migrateForumSchema(db, "sqlite");

export const forumDb = db;
export const forumStorage = createKyselyForumStorage(db);

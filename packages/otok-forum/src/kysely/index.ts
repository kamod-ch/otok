export type { ForumDatabase } from "./schema.js";
export type { ForumDialect } from "./migrations.js";
export {
  FORUM_MIGRATION_ID,
  FORUM_SQLITE_UP,
  FORUM_SQLITE_DOWN,
  FORUM_POSTGRES_UP,
  FORUM_POSTGRES_DOWN,
  getForumMigration,
} from "./migrations.js";
export { createKyselyForumStorage, migrateForumSchema } from "./storage-adapter.js";
export { rollbackForumSchema } from "./migrate.js";

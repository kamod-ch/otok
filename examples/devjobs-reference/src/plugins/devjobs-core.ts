import { definePlugin } from "@kamod-ch/otok";
import { setOtokCacheScope } from "@kamod-ch/otok/server";
import { authFromOtokContext, tryGetAuthRuntime } from "@kamod-ch/otok-auth";
import { getKyselyRuntime } from "@kamod-ch/otok-kysely/registry";
import { activateQueueRuntime } from "@kamod-ch/otok-queue";
import { createPostgresQueueProvider, migratePostgresQueueSchema } from "@kamod-ch/otok-queue/providers/postgres";
import { resolveQueueRetry } from "@kamod-ch/otok-queue";
import type { Kysely } from "kysely";
import type { QueueDatabase } from "@kamod-ch/otok-queue/providers/postgres";
import type { DevjobsDatabase } from "../db/types.js";
import type { DevjobsQueueJobs } from "../lib/import-worker.js";
import { readLocaleFromContext, resolveVerifiedTenantId } from "../lib/tenant.js";

const devjobsCoreFactory = definePlugin({
  name: "otok-devjobs-core",
  version: "0.1.0",
  schema: {
    parse() {
      return {};
    },
  },
});

export default function devjobsCore() {
  const plugin = devjobsCoreFactory({});

  plugin.configureApp = async ({ app }) => {
    const { db } = getKyselyRuntime<DevjobsDatabase>();

    app.use("*", async (c, next) => {
      let userId: string | undefined;
      let tenantId: string | undefined;
      const authRuntime = tryGetAuthRuntime();
      if (authRuntime) {
        const auth = authFromOtokContext(c, authRuntime.helpers);
        const session = await auth.getSession();
        if (session) {
          userId = session.id;
          tenantId = await resolveVerifiedTenantId(db, session.id);
        }
      }
      const locale = readLocaleFromContext(c);
      setOtokCacheScope(c, { userId, tenantId, locale });
      await next();
    });

    await migratePostgresQueueSchema(db as unknown as Kysely<QueueDatabase>);
    const retry = resolveQueueRetry({ maxAttempts: 5 });
    const provider = createPostgresQueueProvider(db as unknown as Kysely<QueueDatabase>, {
      type: "postgres",
      retry,
    });

    activateQueueRuntime<DevjobsQueueJobs>({
      provider: provider as never,
      retry,
      cron: [],
    });
  };

  return plugin;
}

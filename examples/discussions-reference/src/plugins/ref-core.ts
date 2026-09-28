import { definePlugin } from "@kamod-ch/otok";
import { setOtokCacheScope } from "@kamod-ch/otok/server";
import { authFromOtokContext, tryGetAuthRuntime } from "@kamod-ch/otok-auth";
import { getKyselyRuntime } from "@kamod-ch/otok-kysely/registry";
import type { RefDatabase } from "../db/types.js";

const refCoreFactory = definePlugin({
  name: "discussions-reference-core",
  version: "0.1.0",
  schema: {
    parse() {
      return {};
    },
  },
});

async function primaryTenantForUser(db: ReturnType<typeof getKyselyRuntime<RefDatabase>>["db"], userId: string) {
  const row = await db
    .selectFrom("tenant_member")
    .select("tenant_id")
    .where("user_id", "=", userId)
    .orderBy("tenant_id asc")
    .executeTakeFirst();
  return row?.tenant_id;
}

export default function refCore() {
  const plugin = refCoreFactory({});

  plugin.configureApp = async ({ app }) => {
    app.use("*", async (c, next) => {
      let userId: string | undefined;
      let tenantId: string | undefined;
      const authRuntime = tryGetAuthRuntime();
      if (authRuntime) {
        const auth = authFromOtokContext(c, authRuntime.helpers);
        const session = await auth.getSession();
        if (session) {
          userId = session.id;
          try {
            const { db } = getKyselyRuntime<RefDatabase>();
            tenantId = await primaryTenantForUser(db, session.id);
          } catch {
            tenantId = undefined;
          }
        }
      }
      const accept = c.req.header("accept-language") ?? "";
      const locale = accept.toLowerCase().startsWith("en") ? "en" : "de";
      setOtokCacheScope(c, { userId, tenantId, locale });
      await next();
    });
  };

  return plugin;
}

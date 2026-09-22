import { createKyselyInstance } from "@kamod-ch/otok-kysely";
import {
  activateQueueRuntime,
  createWorkerHealth,
  resolveQueueRetry,
  startWorkerHealthServer,
} from "@kamod-ch/otok-queue";
import { createPostgresQueueProvider, migratePostgresQueueSchema } from "@kamod-ch/otok-queue/providers/postgres";
import { runQueueWorker } from "@kamod-ch/otok-queue/worker";
import type { Kysely } from "kysely";
import type { QueueDatabase } from "@kamod-ch/otok-queue/providers/postgres";
import type { DevjobsDatabase } from "../src/db/types.js";
import { processCsvImport, type DevjobsQueueJobs } from "../src/lib/import-worker.js";

const connectionString = process.env.DATABASE_URL ?? "postgres://otok:otok@localhost:5435/devjobs_reference";

const db = await createKyselyInstance<DevjobsDatabase>("postgres", connectionString);

await migratePostgresQueueSchema(db as unknown as Kysely<QueueDatabase>);
const retry = resolveQueueRetry({ maxAttempts: 5 });
const provider = createPostgresQueueProvider<DevjobsQueueJobs>(db as unknown as Kysely<QueueDatabase>, {
  type: "postgres",
  retry,
});

activateQueueRuntime<DevjobsQueueJobs>({ provider: provider as never, retry, cron: [] });

const healthPort = Number(process.env.WORKER_HEALTH_PORT ?? 9091);
const health = createWorkerHealth();
health.ready = true;
startWorkerHealthServer(health, healthPort);

runQueueWorker({
  provider,
  workerId: process.env.WORKER_ID ?? `worker-${process.pid}`,
  concurrency: 2,
  health,
  handlers: {
    "devjobs.import-csv": async (payload) => {
      await processCsvImport(db, payload.importId);
    },
  },
});

console.log(`Devjobs queue worker listening (health :${healthPort})`);

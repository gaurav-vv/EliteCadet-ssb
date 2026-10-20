import Anthropic from "@anthropic-ai/sdk";
import pg from "pg";
import { loadConfig } from "./config.js";
import { runOnce, type Logger } from "./process.js";

// Long-running worker: polls the queue, processes jobs, stops cleanly on
// SIGTERM (deploy) after finishing the jobs in hand.

const log: Logger = {
  info: (msg, data) => console.log(JSON.stringify({ level: "info", msg, ...data, at: new Date().toISOString() })),
  error: (msg, data) => console.error(JSON.stringify({ level: "error", msg, ...data, at: new Date().toISOString() })),
};

async function main() {
  const config = loadConfig();
  const pool = new pg.Pool({ connectionString: config.databaseUrl, max: config.concurrency + 2 });
  // The SDK retries 408/409/429/5xx and connection errors twice before the
  // queue's own backoff takes over.
  const client = new Anthropic({ maxRetries: 2, timeout: config.evaluation.timeoutMs });

  let stopping = false;
  const stop = () => {
    stopping = true;
    log.info("stopping after current jobs");
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);

  // New jobs wake the loop at once (pg_notify from 0019), so an interview
  // follow-up doesn't wait for the next poll. Polling stays as the fallback.
  let wake: (() => void) | null = null;
  const listener = new pg.Client({ connectionString: config.databaseUrl });
  try {
    await listener.connect();
    listener.on("notification", () => wake?.());
    listener.on("error", () => log.error("listen connection lost; polling only"));
    await listener.query("listen ai_jobs");
  } catch {
    log.error("could not listen for new jobs; polling only");
  }

  const routes = { evaluation: config.evaluation, question: config.question };
  log.info("worker started", { worker: config.workerId, evaluation: config.evaluation.model, question: config.question.model, concurrency: config.concurrency });
  while (!stopping) {
    let handled = 0;
    try {
      handled = await runOnce(pool, client, config.workerId, config.concurrency, routes, log);
    } catch (error) {
      log.error("poll failed", { error: error instanceof Error ? error.name : "unknown" });
    }
    if (handled === 0 && !stopping) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, config.pollIntervalMs);
        wake = () => {
          clearTimeout(timer);
          resolve();
        };
      });
      wake = null;
    }
  }
  await listener.end().catch(() => undefined);
  await pool.end();
  log.info("worker stopped");
}

main().catch((error: unknown) => {
  log.error("worker could not start", { error: error instanceof Error ? error.message : "unknown" });
  process.exit(1);
});

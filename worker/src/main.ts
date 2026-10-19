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

  log.info("worker started", { worker: config.workerId, model: config.evaluation.model, effort: config.evaluation.effort, concurrency: config.concurrency });
  while (!stopping) {
    let handled = 0;
    try {
      handled = await runOnce(pool, client, config.workerId, config.concurrency, config.evaluation, log);
    } catch (error) {
      log.error("poll failed", { error: error instanceof Error ? error.name : "unknown" });
    }
    if (handled === 0 && !stopping) await new Promise((r) => setTimeout(r, config.pollIntervalMs));
  }
  await pool.end();
  log.info("worker stopped");
}

main().catch((error: unknown) => {
  log.error("worker could not start", { error: error instanceof Error ? error.message : "unknown" });
  process.exit(1);
});

# SSB Academy AI worker (T101)

A small, separate service that does all AI work for the platform, so no web request ever waits on a
model and a model failure never loses a student's answer.

```text
App / database trigger ──enqueue──▶ ai_jobs (Postgres) ◀──claim── worker ──▶ Claude API
                                          │                          │
                                ai_evaluations, ai_usage ◀─────store─┘
```

- **Queue:** `ai_jobs`, with claims using `FOR UPDATE SKIP LOCKED`, so any number of workers can
  run safely. A crashed worker's job is picked up again after 10 minutes.
- **Wake-up:** new jobs wake the worker at once through `LISTEN ai_jobs`, so an interview
  follow-up doesn't wait for the next poll. Polling stays as the fallback.
- **Job kinds:**
  - `evaluation`: rubric feedback on psychology tests and whole interviews
  - `interview_question`: the AI interviewer's next question. If that job gives up, the database
    continues the interview from the question bank.
- **Retries:**
  - The SDK retries twice (429/5xx/network).
  - The queue then retries with exponential backoff (30s, 60s…), up to 3 attempts.
  - Final failures — refusals, bad requests, auth — mark the job `dead`, and the app shows
    "feedback unavailable".
- **Evaluation engine:**
  - versioned rubrics (`src/rubrics/`)
  - a structured JSON output schema, validated by the API and again with Zod
  - refusal fallback (`fallbacks: "default"`)
  - the rubric system prompt cached
  - the answer passed as data, never as instructions
- **Guardrails:** these discard an evaluation before it's stored —
  - selection predictions
  - "official SSB score"
  - single readiness percentages
  - clinical claims
  - comments on accent
  - any evidence quote that isn't the student's own words
- **Telemetry:** tokens, cost (micro-USD) and latency for every call, in `ai_usage`, readable by
  super admins only.

## Run locally

```bash
cd worker
npm ci
DATABASE_URL=postgresql://... ANTHROPIC_API_KEY=... npm start
```

## Environment

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | — | Supabase **session pooler** URI. Server-side only. |
| `ANTHROPIC_API_KEY` | yes | — | Lives only in the worker's host settings, never in the web app or the repo. |
| `AI_EVALUATION_MODEL` | no | `claude-opus-5-5` | Per-route model; change after measuring quality. |
| `AI_EVALUATION_EFFORT` | no | `medium` | `low`…`max`. |
| `AI_EVALUATION_MAX_TOKENS` | no | `16000` | |
| `AI_REQUEST_TIMEOUT_MS` | no | `120000` | |
| `AI_QUESTION_MODEL` | no | `claude-opus-5-5` | The AI interviewer's next question (T103). |
| `AI_QUESTION_EFFORT` | no | `low` | Questions need speed more than depth. |
| `AI_QUESTION_MAX_TOKENS` | no | `4000` | |
| `AI_QUESTION_TIMEOUT_MS` | no | `45000` | After this the student can skip to a bank question. |
| `WORKER_CONCURRENCY` | no | `2` | Jobs processed at once. |
| `POLL_INTERVAL_MS` | no | `3000` | Idle polling delay. |
| `WORKER_ID` | no | `worker-<pid>` | Shown in job locks. |

## Deploy (Railway or Render, Mumbai region)

1. Create a service from this repository with the **root directory** set to `worker`.
2. Build command: `npm ci`. Start command: `npm start`. It's a background worker, with no public
   port.
3. Add the environment variables above.
4. Stopping is graceful: on SIGTERM the worker finishes its current jobs and exits.

## Test

```bash
npm test                                   # engine tests with a fake model (no API cost)
TEST_DATABASE_URL=postgresql://... npm test  # also the queue tests, against a database built by
                                             # ../supabase/tests/run-workflow-check.sh
```

CI runs both on every pull request, against a throwaway Postgres.

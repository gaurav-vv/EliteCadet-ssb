# Live meeting rooms (T094)

Mentors and academy admins run **one-to-one** and **whole-batch** video meetings inside the app. Media goes over
WebRTC through a **LiveKit** SFU (selective forwarding unit). LiveKit is open source, so you can
self-host it or use LiveKit Cloud. Spec: `specs.md` §8a.4h. Schema: `supabase/migrations/0022_live_meetings.sql`
and `0023_live_meetings_academy_admin.sql`.

Nothing is recorded. No audio or video is stored anywhere.

## How it works

```text
Mentor schedules (Sessions → Schedule session → "Live video room")
  → save_live_meeting()   [Postgres: audience, 15–120 min, 120 min/day cap, no overlap, batch ≤ 100]
Academy admin schedules (Academy → Sessions → Schedule meeting), choosing a host mentor
  → admin_schedule_live_meeting()   [same rules + batch/student in the admin's academy,
                                     host is an active mentor of that batch]

A host opens the room (the mentor or an academy admin; from 15 min before the start until the end)
  → joinMeetingAction → start_live_meeting()   [server clock; status becomes "live"]
  → LiveKit createRoom(maxParticipants)        [2 for one-to-one, 101 for a batch]
  → 10-minute, single-room join token          [identity = the signed-in user's id]

Student opens the room (once the mentor has started, until the scheduled end)
  → same action: RLS decides who can see the session, plus a check against the removal list
  → token: one-to-one students can publish camera and mic; batch students start listen-only

LiveKit → POST /api/livekit/webhook (signed with the API secret)
  → record_live_meeting_event()  [service role: join/leave rows; a join after the start marks the student present]

Mentor ends the meeting (or the scheduled end passes)
  → end_live_meeting()  [completed, actual end time, open rows closed, joiners marked present]
  → LiveKit deleteRoom  [everyone is disconnected]
```

### Rules and where they're enforced

| Rule | Enforced in |
|---|---|
| Two meeting types only: one-to-one (exactly one student of a batch the mentor teaches) or the whole batch | `save_live_meeting`, `sessions_meeting_audience` check, participant trigger |
| Batch meetings: at most **100** enrolled students | `guard_live_meeting` (schedule), LiveKit `maxParticipants` 101 (join) |
| Length **15–120 minutes**; start in the future and at most 90 days ahead | form → `validateMeetingInput` → `sessions_meeting_duration` check + trigger |
| At most **120 minutes per mentor per calendar day** (IST). Scheduled, live and completed meetings count their full scheduled length (ending early never frees time); cancelled meetings don't. A meeting that crosses midnight counts on both days | `guard_live_meeting`, under a per-mentor `pg_advisory_xact_lock`, so two simultaneous bookings can't both get through |
| No overlapping meetings for a mentor | existing `sessions_no_overlap` exclusion constraint (0010) |
| Actual start/end, cancellation time and attendance come from the server clock or the provider, never the browser | `guard_live_meeting` rejects client writes; the `SECURITY DEFINER` functions use `now()` |
| The room opens 15 minutes before the start. Students can join only after the mentor starts. Nobody can join after the scheduled end | `getMeetingView` / `joinMeeting` (server time), `start_live_meeting` |
| Only the meeting's mentor and its students get a token; anyone else gets a 404 | RLS `can_see_session` + role checks in `lib/server/meetings/service.ts` |
| A student a host removed can't rejoin | `live_meeting_removals` |
| Academy admins schedule, start, end, cancel, co-host and read attendance only in **their own** academy; only active admins | `admin_schedule_live_meeting`, `cancel_live_meeting`, `start/end_live_meeting` (all checking `current_active_admin_academy_id()`); no direct write policy on `sessions` for admins |

**Daily limit when an admin books:** a meeting always has a **host mentor** (`sessions.mentor_id`),
and the 120 minutes are the host mentor's, whoever books. An admin's booking uses the mentor's
allowance and is checked under the same per-mentor lock, so a mentor and an admin booking at the
same moment can't go over the limit together. Admins have no allowance of their own. Joining as a
co-host doesn't count. `created_by` records who booked.

**Timezone:** academies don't have a timezone setting yet, so scheduling and the daily cap both use
**IST (Asia/Kolkata, no DST)**, the same as every other session in the app. Each meeting stores its
timezone. The `sessions_meeting_timezone` check keeps it at IST until academies get their own
setting.

**Host-led batch layout:** students join listen-only. The mentor's video (or screen share) is the
main view. The mentor can, per student, *allow to speak*, *allow to speak and share video*, *stop*,
*mute* or *remove*, through server actions that call LiveKit's RoomService with the API secret. Only
students who are publishing produce streams, so nobody receives 99 other videos. Clients use
adaptive stream and dynacast.

**Known limits:**
- A student's speaking permission resets if they rejoin; the mentor grants it again.
- At the scheduled end, the mentor's browser ends the meeting and students' browsers leave. If
  nobody's browser is open at that moment, the room is closed the next time anyone opens the
  meeting page. Nobody can get a new token after the end.
- There is no chat. The spec mentions it; it was left out of this round.
- Academy admins schedule, start, end, cancel and co-host meetings, but can't **edit** one; they
  cancel and reschedule instead. They can't change a mentor's link or in-person sessions. Super
  admins keep their existing read-only oversight and never join.
- The room's cap is the students plus two hosts (the mentor and one admin). A second admin joining
  a full batch room is refused by LiveKit.

## Environment variables

All are **server-only**. Never prefix them with `NEXT_PUBLIC_`.

| Variable | Local | Production |
|---|---|---|
| `LIVEKIT_URL` | `ws://localhost:7880` | `wss://<project>.livekit.cloud`, or your self-hosted `wss://` URL. Browsers connect to it, so it must be publicly reachable |
| `LIVEKIT_API_KEY` | the key you started livekit-server with (`devkey`) | API key from LiveKit Cloud → Settings → Keys |
| `LIVEKIT_API_SECRET` | the 32+ character secret you chose | the matching secret |
| `SUPABASE_SERVICE_ROLE_KEY` | the **local** service key from `npx supabase status` | the **remote** project's service-role key |

Without the three `LIVEKIT_*` values, meetings can still be scheduled, but the join screen says
video isn't set up. Without the service-role key, the webhook answers 503 and no attendance is
recorded.

Keep local and remote credentials apart. If `NEXT_PUBLIC_SUPABASE_URL` is `http://127.0.0.1:54321`,
every Supabase key must come from `npx supabase status`, not from the hosted project.

## Local setup

1. **Database:** apply `supabase/migrations/0022_live_meetings.sql` to your local database. It's
   already applied to the local Docker database used during development. For another database,
   paste the file into Studio's SQL editor (`http://127.0.0.1:54323`) or run
   `npx supabase migration up`. It's forward-only and doesn't change existing rows.
2. **LiveKit server** (Docker, Linux; `--network host` lets its webhook reach `localhost:3000`):

   ```bash
   export LIVEKIT_DEV_SECRET="$(openssl rand -hex 24)"   # 48 chars; keep it for .env.local
   docker run --rm --name livekit-dev --network host \
     -e LIVEKIT_KEYS="devkey: $LIVEKIT_DEV_SECRET" \
     -v "$PWD/scripts/livekit/livekit.dev.yaml:/etc/livekit.yaml:ro" \
     livekit/livekit-server --config /etc/livekit.yaml --node-ip 127.0.0.1
   ```

   On macOS or Windows, Docker can't use `--network host`. Publish ports
   `-p 7880:7880 -p 7881:7881 -p 50000-50100:50000-50100/udp` instead, and change the webhook URL in
   the YAML to `http://host.docker.internal:3000/api/livekit/webhook`. You can also install the
   `livekit-server` binary and run `livekit-server --config scripts/livekit/livekit.dev.yaml`.
3. **`.env.local`:**

   ```bash
   LIVEKIT_URL=ws://localhost:7880
   LIVEKIT_API_KEY=devkey
   LIVEKIT_API_SECRET=<the same LIVEKIT_DEV_SECRET>
   SUPABASE_SERVICE_ROLE_KEY=<local service key from `npx supabase status`>
   ```

4. Restart `npm run dev`. Next.js reads env files only at startup.
5. To try a meeting, use two browsers (or one normal and one private window): one signed in as a
   mentor of a batch, one as a student in that batch. Browsers allow camera and mic on
   `http://localhost` without HTTPS. Other devices on your LAN need HTTPS.

## Production / deployment

- **LiveKit Cloud** (recommended; India region per `specs.md`): create a project, then copy the
  `wss://` URL and an API key/secret into your host's server environment variables (e.g. Vercel →
  Project → Settings → Environment Variables). Under **Settings → Webhooks**, add
  `https://<your-app-domain>/api/livekit/webhook`, signed with the same API key.
- **Self-hosted LiveKit:** you need a public domain with TLS (`wss://`), and these firewall ports
  open: TCP 443 or 7880 for signalling, TCP 7881 for ICE over TCP, and the UDP port range
  (default 50000–60000) for media. Enable LiveKit's built-in **TURN/TLS on 443** (`turn.enabled`,
  a TLS cert, `turn.tls_port: 443`) so users behind strict corporate or school firewalls can still
  connect. LiveKit Cloud already includes TURN.
- The app never uses localhost URLs at runtime. Every endpoint comes from env vars, and the room
  name and tokens come from the server.
- Apply `0022_live_meetings.sql` to the hosted database **after** 0001–0021. If your database is
  still on the 0005–0021 catch-up file, run that first, then 0022 on its own.
- Recording (T095) is a separate, not-yet-built task. This feature never starts LiveKit Egress.

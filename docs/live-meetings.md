# Live meeting rooms (T094)

Mentors and academy admins run **one-to-one** and **whole-batch** video meetings inside the app. Media goes over
WebRTC through a **LiveKit** SFU (selective forwarding unit). LiveKit is open source, so you can
self-host it or use LiveKit Cloud. Spec: `specs.md` §8a.4h. Schema: `supabase/migrations/0022_live_meetings.sql`,
`0023_live_meetings_academy_admin.sql` and `0025_meeting_chat_attendance.sql`.

Nothing is recorded. No audio or video is stored anywhere.

## How it works

```text
Mentor schedules (Sessions → Schedule session → "Live video room")
  → save_live_meeting()   [Postgres: audience, 15–120 min, 120 min/day cap, no overlap, batch ≤ 100]
Academy admin schedules (Academy → Sessions → Schedule meeting), choosing a host mentor
  → admin_schedule_live_meeting()   [same rules + batch/student in the admin's academy,
                                     host is an active mentor of that batch]
A batch meeting appears automatically for every student currently enrolled in that batch
(RLS: can_see_session reads batch_students live). No per-student invitation exists or is needed.

A host opens the room (the mentor or an academy admin; from 15 min before the start until the end)
  → joinMeetingAction → start_live_meeting()   [server clock; status becomes "live"]
  → LiveKit createRoom(maxParticipants)        [3 for one-to-one, 102 for a batch]
  → 10-minute, single-room join token          [identity = the signed-in user's id]

Student opens the room (once a host has started, until the scheduled end)
  → same action: RLS + enrollment decide who can see it, plus the removal list
  → token: one-to-one students publish camera + mic; batch students start listen-only;
    nobody can publish data (chat/reactions go through the server)

In the room
  → chat:      sendMeetingMessageAction → post_live_meeting_message() [member? live? rate?] → stored
               → server broadcasts the stored row to the room (LiveKit sendData)
  → reactions: sendReactionAction → allowed emoji? member? live? → server broadcast
  → raise hand: setMyHandAction → server sets the participant attribute "hand"
  → host controls: allow to speak / video, stop, mute, mute all students, lower hand(s), remove

LiveKit → POST /api/livekit/webhook (signed with the API secret)
  → record_live_meeting_event()  [join/leave/room_finished with LiveKit's timestamps]
  → finish_overdue_live_meetings() [server-side scheduled end, every event]

The host ends it for everyone (or the scheduled end passes)
  → end_live_meeting()   [completed, actual end, open intervals closed, 75% attendance finalized]
  → LiveKit deleteRoom   [everyone disconnected; success only if this succeeded]
```

### Rules and where they're enforced

| Rule | Enforced in |
|---|---|
| Two meeting types only: one-to-one (exactly one student of a batch the mentor teaches) or the whole batch | `save_live_meeting`, `sessions_meeting_audience` check, participant trigger |
| Batch meetings: at most **100** enrolled students | `guard_live_meeting` (schedule), LiveKit `maxParticipants` (join) |
| Length **15–120 minutes**; start in the future and at most 90 days ahead | form → `validateMeetingInput` → `sessions_meeting_duration` check + trigger |
| At most **120 minutes per mentor per calendar day** (IST). Scheduled, live and completed meetings count their full scheduled length; cancelled don't. Crossing midnight counts on both days | `guard_live_meeting`, under a per-mentor `pg_advisory_xact_lock` |
| No overlapping meetings for a mentor | `sessions_no_overlap` exclusion constraint (0010) |
| Who may take part: the host mentor, an active admin of the meeting's academy, or a student of its audience **as enrolled now**, never a removed student | `can_join_live_meeting` (0025), RLS `can_see_session`, `lib/server/meetings/service.ts` |
| The room opens 15 minutes before the start; students join after a host starts; nobody joins after the scheduled end | `getMeetingView` / `joinMeeting` (server time), `start_live_meeting` |
| Chat: only people in the meeting, only while it's live, 1–1000 characters, max 20 messages per 30 s; read by participants and staff who can see the session | `post_live_meeting_message`, `live_messages_read` policy (no client insert policy) |
| Reactions: a fixed emoji set, members only, live only, 10 per 10 s per person | `sendReaction` (server); clients have no data-publish permission |
| Actual start/end, cancellation, attendance and its finalization come from the server or LiveKit, never the browser | guard triggers (0022, 0025), `SECURITY DEFINER` functions, signed webhook |
| Academy admins act only in **their own** academy | `admin_schedule_live_meeting`, `cancel_live_meeting`, `start/end_live_meeting` (check `current_active_admin_academy_id()`) |

**Daily limit when an admin books:** a meeting always has a **host mentor** (`sessions.mentor_id`),
and the 120 minutes are the host mentor's, whoever books. An admin's booking uses the mentor's
allowance and is checked under the same per-mentor lock. Admins have no allowance of their own.
Joining as a co-host doesn't count. `created_by` records who booked.

**Timezone:** academies don't have a timezone setting yet, so scheduling and the daily cap both use
**IST (Asia/Kolkata, no DST)**, the same as every other session in the app.

## The meeting room (UI)

Layout follows `session_ref.png`:
- **Left:** session details (title, live/upcoming/ended/cancelled, date, time and duration, host,
  audience, "You are in this batch" for students). It becomes a compact strip on screens narrower
  than 1536px.
- **Centre:** a dark video stage with Live, who's sharing, the time left and connection state.
- **Grid:** a paged 3×3 grid (host first, raised hands next). Students who aren't publishing show
  initials, so a batch room never streams 100 videos. A screen share takes the main area, with
  cameras in a strip.
- **Toolbar:** mic, camera, share screen (host only; disabled with the reason for others), raise
  hand (students), chat with an unread badge, participants with a count, reactions, More (host:
  mute all students, lower all hands; everyone: leave). Whiteboard, polls and breakout rooms are
  listed there as not available yet.
- **Leave / End:** **Leave** for everyone; **End meeting** (red) for hosts.
- **Right:** Participants (search; host, hand, mic, camera and connection state; host actions per
  student) and Chat (history, live messages, sending/failed/retry, empty state, emoji insert).
- **Other states:** connecting, reconnecting, host not in the room, a 5-minute warning,
  camera/microphone permission denied, and connection errors.

### Leave vs End meeting for everyone

- **Leave** (anyone) disconnects only you; the meeting continues and you can rejoin.
- **End meeting** (host mentor or academy admin) asks for confirmation (*End for everyone* /
  *Leave without ending* / *Cancel*), then:
  1. `end_live_meeting()` marks it completed with the server time, closes open intervals and
     finalizes attendance. This is idempotent: ending again re-runs finalization and creates no
     duplicate rows.
  2. LiveKit deletes the room, which disconnects every participant and stops their camera, mic and
     screen share. Rejoining is refused ("This meeting has ended").
  3. If the room couldn't be deleted (service down or timed out, 3 tries × 6 s), the host sees an
     error and **Try again**, never a false success. Retrying is safe.
- **At the scheduled end**, every client leaves and a host's client ends the meeting. Server-side,
  the overdue sweep (`finish_overdue_live_meetings`) completes it even with no host connected:
  the webhook runs it on every LiveKit event, and the worker runs it every minute.
- **The original bug:** after a meeting ended, people could see "You left the meeting — rejoin
  while it's still running". The screen depended on which disconnect reason arrived first, and at
  the scheduled end every student's own timer produced "client initiated". Now the client records
  that the meeting is over *before* disconnecting (`disconnectOutcome`,
  `lib/meetings/room-logic.ts`).
- **If the host disconnects** (closed browser, network), the meeting stays open until its
  scheduled end. Students see "<host> isn't in the room right now", and a co-host (academy admin)
  can take over.

**Known limits:**
- A student's speaking permission and raised hand reset if they rejoin.
- There's no whiteboard, polls or breakout rooms (shown as not available). There's no recording
  (by decision).
- Academy admins can't **edit** a meeting; they cancel and reschedule.
- The room's cap is the students plus two hosts. A second academy admin joining a full batch room
  is refused by LiveKit.

## What attendance means (75% rule, 0025)

- **Source:** only LiveKit's signed webhooks (join, leave, room finished), stored per LiveKit
  participant session with **LiveKit's** timestamps. Duplicate and out-of-order events give the
  same result. A missing leave event is closed at the meeting's end. Clients can't submit
  attendance or durations.
- **Eligible connected time:** the *union* of a person's visits (reconnects and two tabs count
  once), clipped to the **scheduled** window (time before the start or after the end doesn't
  count).
- **Present:** eligible time ≥ **75% of the scheduled duration** (e.g. 45 of 60 minutes; exactly
  75% counts). **Absent:** less, once the meeting has ended. Nothing is decided while it's in
  progress.
- **Same rule for one-to-one and batch meetings.** The audience is the batch as enrolled when the
  meeting is finalized, or the one-to-one student. Students who never joined are absent with 0
  seconds.
- **Ended early:** the rule is literal. A 60-minute meeting the host ends after 30 minutes leaves
  everyone absent (30 < 45).
- **Stored** in the existing `session_attendance`: `status`, `connected_seconds`,
  `required_seconds`, `computed_at`, `marked_by = NULL` (computed). A mentor's own mark is never
  overwritten; their seconds are still recorded. Finalization is idempotent, and a late webhook
  after finalization recomputes.
- **Meetings that never started** (no host joined) get no attendance.

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

1. **Database:** apply `supabase/migrations/0022` through `0025` (in order) to your local database. They're
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
- Apply `0022`, `0023`, `0024` and `0025` (in order) to the hosted database **after** 0001–0021,
  and only once you've approved them. If your database is still on the 0005–0021 catch-up file, run
  that first, then each of 0022–0025 on its own.
- Optional but recommended: run the worker (`worker/`), which also runs the overdue-meeting sweep
  every minute.
- Recording (T095) is a separate, not-yet-built task. This feature never starts LiveKit Egress.

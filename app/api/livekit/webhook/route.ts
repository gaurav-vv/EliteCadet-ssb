import { NextResponse, type NextRequest } from "next/server";
import { closeRoom, liveKitConfig, sessionIdFromRoom, webhookReceiver } from "@/lib/server/meetings/livekit";
import { isUuid } from "@/lib/server/users/validation";
import { AdminClientConfigError, createAdminClient } from "@/lib/supabase/admin";

// LiveKit webhook (T094): participant joined / left and room finished →
// connected-time attendance (0025). Public route (no user session); trust
// comes ONLY from LiveKit's signature (a JWT signed with our API secret,
// carrying the body's hash). Anything unsigned is rejected; anything
// unrecognised is ignored. Writes go through record_live_meeting_event(),
// executable by the service role only, with LIVEKIT's timestamps — so
// duplicate and out-of-order deliveries give the same result.
//
// Every signed event also runs finish_overdue_live_meetings(): a meeting whose
// scheduled end has passed is completed (and its attendance finalized) even if
// no host is there to end it, and its room is closed.

const TRACKED = new Set(["participant_joined", "participant_left", "room_finished"]);

const toIso = (seconds: bigint | number | undefined | null, fallback: Date) => {
  const n = typeof seconds === "bigint" ? Number(seconds) : typeof seconds === "number" ? seconds : 0;
  return (n > 0 ? new Date(n * 1000) : fallback).toISOString();
};

export async function POST(request: NextRequest) {
  const cfg = liveKitConfig();
  if (!cfg) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const body = await request.text();
  let event;
  try {
    event = await webhookReceiver(cfg).receive(body, request.headers.get("authorization") ?? undefined);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    if (error instanceof AdminClientConfigError) {
      console.error(`[meetings] webhook cannot record attendance: ${error.message}`);
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }
    throw error;
  }

  const sessionId = sessionIdFromRoom(event.room?.name);
  if (TRACKED.has(event.event) && sessionId) {
    const now = new Date();
    const userId = event.participant?.identity;
    const sid = event.participant?.sid;
    const participantEvent = event.event !== "room_finished";
    if (!participantEvent || (userId && isUuid(userId) && sid)) {
      const joinedMs = Number(event.participant?.joinedAtMs ?? 0);
      const { error } = await admin.rpc("record_live_meeting_event", {
        p_session: sessionId,
        p_user: participantEvent ? userId : null,
        p_participant_sid: participantEvent ? sid : "",
        p_event: event.event,
        p_joined_at: joinedMs > 0 ? new Date(joinedMs).toISOString() : toIso(event.participant?.joinedAt, now),
        p_event_at: toIso(event.createdAt, now),
      });
      if (error) {
        console.error(`[meetings] webhook write failed: code=${error.code ?? "none"}`);
        // 5xx so LiveKit retries; writes are idempotent per participant sid.
        return NextResponse.json({ error: "write_failed" }, { status: 500 });
      }
    }
  }

  // Server-side end-time enforcement, piggybacking on any signed event.
  const { data: ended, error: sweepError } = await admin.rpc("finish_overdue_live_meetings");
  if (sweepError) console.error(`[meetings] sweep failed: code=${sweepError.code ?? "none"}`);
  for (const id of (ended as string[] | null) ?? []) {
    await closeRoom(cfg, id).catch((e: Error) => console.error(`[meetings] close overdue room failed: ${e?.message ?? "unknown"}`));
  }
  return NextResponse.json({ ok: true });
}

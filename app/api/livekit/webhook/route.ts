import { NextResponse, type NextRequest } from "next/server";
import { liveKitConfig, sessionIdFromRoom, webhookReceiver } from "@/lib/server/meetings/livekit";
import { isUuid } from "@/lib/server/users/validation";
import { AdminClientConfigError, createAdminClient } from "@/lib/supabase/admin";

// LiveKit webhook (T094): participant joined / left → live meeting attendance.
// Public route (no user session); trust comes ONLY from LiveKit's signature
// (a JWT signed with our API secret, carrying the body's hash). Anything
// unsigned or unrecognised is rejected or ignored. Writes go through
// record_live_meeting_event() (0022), executable by the service role only.

const TRACKED = new Set(["participant_joined", "participant_left"]);

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

  const sessionId = sessionIdFromRoom(event.room?.name);
  const userId = event.participant?.identity;
  const sid = event.participant?.sid;
  if (!TRACKED.has(event.event) || !sessionId || !userId || !isUuid(userId) || !sid) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc("record_live_meeting_event", { p_session: sessionId, p_user: userId, p_participant_sid: sid, p_event: event.event });
    if (error) {
      console.error(`[meetings] webhook write failed: code=${error.code ?? "none"}`);
      // 5xx so LiveKit retries; the write is idempotent per participant sid.
      return NextResponse.json({ error: "write_failed" }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof AdminClientConfigError) {
      console.error(`[meetings] webhook cannot record attendance: ${error.message}`);
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
}

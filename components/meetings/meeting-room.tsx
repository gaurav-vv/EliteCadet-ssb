"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LiveKitRoom } from "@livekit/components-react";
import { DisconnectReason, MediaDeviceFailure } from "livekit-client";
import { CalendarClock, Mic, Video, VideoOff } from "lucide-react";
import { RoomStage } from "@/components/meetings/room-stage";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { joinMeetingAction, meetingJoinStateAction } from "@/lib/actions/meetings";
import type { JoinGrant, JoinState } from "@/lib/server/meetings/service";

interface MeetingRoomProps {
  sessionId: string;
  title: string;
  role: "mentor" | "admin" | "student";
  kind: "one_to_one" | "batch";
  initialJoin: JoinState;
  opensAtLabel: string;
  backHref: string;
}

type Phase =
  | { name: "lobby" }
  | { name: "connecting"; grant: JoinGrant }
  | { name: "left" }
  | { name: "ended" }
  | { name: "removed" }
  | { name: "error"; message: string };

const WAITING: Partial<Record<JoinState, { title: string; description: string }>> = {
  too_early: { title: "The room isn't open yet", description: "" },
  waiting_for_mentor: { title: "Waiting for the meeting to start", description: "You'll be able to join as soon as your mentor (or academy) starts the meeting. This page checks every few seconds." },
  ended: { title: "This meeting has ended", description: "It's in your past sessions now." },
  cancelled: { title: "This meeting was cancelled", description: "Check your sessions for the reason and what's next." },
  removed: { title: "You can't rejoin this meeting", description: "Your mentor removed you from it. Contact them if this was a mistake." },
  not_configured: { title: "Video meetings aren't set up yet", description: "This server has no video service configured. Ask your platform admin." },
};

// Lobby → (token from the server) → LiveKit room → outcome. The media token
// comes only from joinMeetingAction, which re-checks everything server-side.
export function MeetingRoom({ sessionId, title, role, kind, initialJoin, opensAtLabel, backHref }: MeetingRoomProps) {
  const [join, setJoin] = useState<JoinState>(initialJoin);
  const [phase, setPhase] = useState<Phase>({ name: "lobby" });
  const [pending, setPending] = useState(false);
  const [deviceWarning, setDeviceWarning] = useState<string | null>(null);
  const isHost = role !== "student";
  const publishesOnJoin = isHost || kind === "one_to_one";
  const [camera, setCamera] = useState(publishesOnJoin);
  const [mic, setMic] = useState(publishesOnJoin);

  // Waiting rooms poll the server (never the browser clock) for a change.
  useEffect(() => {
    if (phase.name !== "lobby" || (join !== "waiting_for_mentor" && join !== "too_early")) return;
    const timer = setInterval(async () => {
      try {
        const result = await meetingJoinStateAction(sessionId);
        if (result.ok) setJoin(result.join);
      } catch {
        // Offline for a moment: keep waiting, the next tick retries.
      }
    }, join === "too_early" ? 30_000 : 8_000);
    return () => clearInterval(timer);
  }, [join, phase.name, sessionId]);

  async function enter() {
    setPending(true);
    setDeviceWarning(null);
    try {
      const result = await joinMeetingAction(sessionId);
      if (!result.ok || !result.data) {
        setPhase({ name: "error", message: result.error?.message ?? "We couldn't let you into the meeting. Please try again." });
        return;
      }
      setPhase({ name: "connecting", grant: result.data });
    } catch {
      setPhase({ name: "error", message: "We couldn't reach the server. Check your connection and try again." });
    } finally {
      setPending(false);
    }
  }

  const onDisconnected = useCallback((reason?: DisconnectReason) => {
    switch (reason) {
      case DisconnectReason.CLIENT_INITIATED:
        setPhase({ name: "left" });
        break;
      case DisconnectReason.PARTICIPANT_REMOVED:
        setPhase({ name: "removed" });
        break;
      case DisconnectReason.ROOM_DELETED:
        setPhase({ name: "ended" });
        break;
      case DisconnectReason.DUPLICATE_IDENTITY:
        setPhase({ name: "error", message: "You joined this meeting from another tab or device, so this one was disconnected." });
        break;
      default:
        setPhase({ name: "error", message: "The connection to the meeting was lost. Check your network and rejoin." });
    }
  }, []);

  const onDeviceFailure = useCallback((failure?: MediaDeviceFailure, kindOfDevice?: MediaDeviceKind) => {
    const device = kindOfDevice === "videoinput" ? "camera" : kindOfDevice === "audioinput" ? "microphone" : "camera or microphone";
    const why =
      failure === MediaDeviceFailure.PermissionDenied
        ? `Your browser blocked the ${device}. Allow it in the address bar's site settings, then turn it on again.`
        : failure === MediaDeviceFailure.NotFound
          ? `We couldn't find a ${device} on this device.`
          : failure === MediaDeviceFailure.DeviceInUse
            ? `Your ${device} is being used by another app.`
            : `We couldn't start your ${device}.`;
    setDeviceWarning(`${why} You're still in the meeting and can listen.`);
  }, []);

  const onError = useCallback((error: Error) => {
    // Media device errors arrive through onDeviceFailure; anything else here is
    // a connection problem (e.g. the video service is unreachable).
    if (error?.name === "NotAllowedError") return;
    setPhase({ name: "error", message: "We couldn't connect to the video service. Check your network and try again." });
  }, []);

  if (phase.name === "connecting") {
    const { grant } = phase;
    return (
      <LiveKitRoom
        serverUrl={grant.serverUrl}
        token={grant.token}
        connect
        audio={mic}
        video={camera}
        options={{ adaptiveStream: true, dynacast: true }}
        onDisconnected={onDisconnected}
        onMediaDeviceFailure={onDeviceFailure}
        onError={onError}
        className="flex flex-col gap-4"
      >
        {deviceWarning && (
          <Alert role="alert">
            <AlertDescription>{deviceWarning}</AlertDescription>
          </Alert>
        )}
        <RoomStage sessionId={sessionId} title={title} role={role} kind={grant.kind} endsAt={grant.endsAt} />
      </LiveKitRoom>
    );
  }

  const outcome =
    phase.name === "left"
      ? { title: "You left the meeting", description: "You can rejoin while it's still running.", rejoin: true }
      : phase.name === "ended"
        ? { title: "The meeting has ended", description: "Thanks for joining. It's in your past sessions now.", rejoin: false }
        : phase.name === "removed"
          ? { title: "You were removed from the meeting", description: "Contact your mentor if this was a mistake.", rejoin: false }
          : phase.name === "error"
            ? { title: "Something went wrong", description: phase.message, rejoin: true }
            : null;

  if (outcome) {
    return (
      <div className="glass-regular rounded-card">
        <EmptyState
          icon={<CalendarClock aria-hidden="true" size={22} />}
          title={outcome.title}
          description={outcome.description}
          action={
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {outcome.rejoin && (
                <Button type="button" className="min-h-11" onClick={() => setPhase({ name: "lobby" })}>
                  Back to the join screen
                </Button>
              )}
              <Button asChild variant="outline" className="min-h-11">
                <Link href={backHref}>Back to the session</Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  const waiting = WAITING[join];
  if (waiting) {
    return (
      <div className="glass-regular rounded-card" aria-live="polite">
        <EmptyState
          icon={<CalendarClock aria-hidden="true" size={22} />}
          title={waiting.title}
          description={join === "too_early" ? `It opens at ${opensAtLabel}. Come back then — this page will update.` : waiting.description}
          action={
            <Button asChild variant="outline" className="mt-2 min-h-11">
              <Link href={backHref}>Back to the session</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <section aria-labelledby="lobby-heading" className="glass-regular flex flex-col gap-5 rounded-card px-6 py-6">
      <div>
        <h2 id="lobby-heading" className="text-[18px] font-semibold text-ink">
          {isHost ? "Ready to start?" : "Ready to join?"}
        </h2>
        <p className="mt-1 text-[14px] text-ink-secondary">
          {role === "mentor"
            ? "Starting opens the room for your students. Meetings aren't recorded."
            : role === "admin"
              ? "You join as a co-host with the same controls as the mentor. If the meeting hasn't started, joining starts it. Meetings aren't recorded."
            : publishesOnJoin
              ? "Your mentor will see and hear you. Meetings aren't recorded."
              : "You'll join listening. Your mentor can let you speak or turn on your camera. Meetings aren't recorded."}
        </p>
      </div>
      {publishesOnJoin && (
        <fieldset className="flex flex-wrap gap-3">
          <legend className="sr-only">Devices on joining</legend>
          <Button type="button" variant="outline" className="min-h-11" aria-pressed={camera} onClick={() => setCamera((v) => !v)}>
            {camera ? <Video aria-hidden="true" size={16} /> : <VideoOff aria-hidden="true" size={16} />}
            {camera ? "Camera on" : "Camera off"}
          </Button>
          <Button type="button" variant="outline" className="min-h-11" aria-pressed={mic} onClick={() => setMic((v) => !v)}>
            <Mic aria-hidden="true" size={16} />
            {mic ? "Microphone on" : "Microphone off"}
          </Button>
        </fieldset>
      )}
      <p className="text-[13px] text-ink-secondary">Your browser will ask to use your camera and microphone. You can still join if you say no.</p>
      <div className="flex justify-end">
        <Button type="button" className="min-h-11" onClick={enter} disabled={pending}>
          {pending ? "Connecting…" : isHost ? "Start or rejoin meeting" : "Join meeting"}
        </Button>
      </div>
    </section>
  );
}

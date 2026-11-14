"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LiveKitRoom } from "@livekit/components-react";
import { MediaDeviceFailure, type DisconnectReason, type RoomOptions } from "livekit-client";
import { CalendarClock } from "lucide-react";
import { PrejoinPreview, type DeviceChoice } from "@/components/meetings/prejoin-preview";
import { RoomStage } from "@/components/meetings/room-stage";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { joinMeetingAction, meetingJoinStateAction } from "@/lib/actions/meetings";
import { disconnectOutcome, type RoomOutcome } from "@/lib/meetings/room-logic";
import type { JoinGrant, JoinState } from "@/lib/server/meetings/service";

interface MeetingRoomProps {
  sessionId: string;
  title: string;
  role: "mentor" | "admin" | "student";
  viewerId: string;
  viewerName: string;
  kind: "one_to_one" | "batch";
  initialJoin: JoinState;
  opensAtLabel: string;
  backHref: string;
  hostName: string;
}

type Phase = { name: "lobby" } | { name: "connecting"; grant: JoinGrant } | { name: "outcome"; outcome: RoomOutcome; detail?: string } | { name: "error"; message: string };

const WAITING: Partial<Record<JoinState, { title: string; description: string }>> = {
  too_early: { title: "The room isn't open yet", description: "" },
  waiting_for_mentor: { title: "Waiting for the meeting to start", description: "You can join as soon as your mentor (or academy) starts it. This page checks every few seconds." },
  ended: { title: "This meeting has ended", description: "It's in your past sessions now." },
  cancelled: { title: "This meeting was cancelled", description: "Check your sessions for the reason and what's next." },
  removed: { title: "You can't rejoin this meeting", description: "The host removed you from it. Contact them if this was a mistake." },
  not_configured: { title: "Video meetings aren't set up yet", description: "This server has no video service configured. Ask your platform admin." },
};

const OUTCOME: Record<RoomOutcome, { title: string; description: string; rejoin: boolean }> = {
  ended: { title: "The meeting has ended", description: "Thanks for joining. It's in your past sessions now.", rejoin: false },
  left: { title: "You left the meeting", description: "The meeting is still running. You can rejoin until it ends.", rejoin: true },
  removed: { title: "You were removed from the meeting", description: "Contact your host if this was a mistake.", rejoin: false },
  duplicate: { title: "You joined from another tab or device", description: "This window was disconnected because the meeting is open somewhere else.", rejoin: true },
  lost: { title: "Connection lost", description: "We couldn't keep you connected. Check your network and rejoin.", rejoin: true },
};

// Lobby → (token from the server) → LiveKit room → outcome. The media token
// comes only from joinMeetingAction, which re-checks everything server-side.
// Errors from turning on the camera/mic (browser or LiveKit publish), never a lost connection.
const DEVICE_ERRORS = new Set(["NotReadableError", "NotFoundError", "OverconstrainedError", "AbortError", "TrackInvalidError", "DeviceUnsupportedError", "PublishTrackError"]);

export function MeetingRoom({ sessionId, title, role, viewerId, viewerName, kind, initialJoin, opensAtLabel, backHref, hostName }: MeetingRoomProps) {
  const [join, setJoin] = useState<JoinState>(initialJoin);
  const [phase, setPhase] = useState<Phase>({ name: "lobby" });
  const [pending, setPending] = useState(false);
  const [deviceWarning, setDeviceWarning] = useState<string | null>(null);
  const isHost = role !== "student";
  // Everyone may use their camera and mic (owner decision 2026-11-14). In a
  // batch, students start muted so a full room isn't noisy; they unmute to speak.
  const [devices, setDevices] = useState<DeviceChoice>({ camera: true, mic: isHost || kind === "one_to_one", cameraId: "", micId: "" });
  // Stable, so LiveKitRoom never rebuilds the room on a re-render. Later
  // toggles in the room reuse the devices chosen on the join screen.
  const roomOptions = useMemo<RoomOptions>(
    () => ({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: devices.micId ? { deviceId: devices.micId } : undefined,
      videoCaptureDefaults: devices.cameraId ? { deviceId: devices.cameraId } : undefined,
    }),
    [devices.cameraId, devices.micId],
  );
  // Set BEFORE this client disconnects whenever the meeting is over for
  // everyone, so the outcome can't depend on which disconnect reason wins.
  const endedHere = useRef(false);
  // True once LiveKit's signal connection is up. After that, any onError comes
  // from turning on the camera/mic (in use by another app or tab, not found,
  // not allowed to publish), which must never throw the user out of the room.
  const signalUp = useRef(false);

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
    endedHere.current = false;
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
    setPhase({ name: "outcome", outcome: disconnectOutcome(reason as number | undefined, endedHere.current) });
  }, []);

  const markEnded = useCallback(() => {
    endedHere.current = true;
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
    if (error?.name === "NotAllowedError") return;
    if (error?.name !== "ConnectionError" && (signalUp.current || DEVICE_ERRORS.has(error?.name))) {
      setDeviceWarning(
        error?.name === "NotReadableError"
          ? "Your camera or microphone is being used by another app or browser tab. Close it, then turn it on again. You're still in the meeting."
          : error?.name === "NotFoundError"
            ? "We couldn't find a camera or microphone on this device. You're still in the meeting and can listen and chat."
            : "We couldn't start your camera or microphone. You're still in the meeting; try turning it on again.",
      );
      return;
    }
    setPhase({ name: "error", message: "We couldn't connect to the video service. Check your network and try again." });
  }, []);

  if (phase.name === "connecting") {
    const { grant } = phase;
    return (
      <LiveKitRoom
        serverUrl={grant.serverUrl}
        token={grant.token}
        connect
        audio={devices.mic}
        video={devices.camera}
        options={roomOptions}
        onDisconnected={onDisconnected}
        onConnected={() => {
          signalUp.current = true;
        }}
        onMediaDeviceFailure={onDeviceFailure}
        onError={onError}
        className="flex min-w-0 flex-col gap-3"
      >
        {deviceWarning && (
          <Alert role="alert">
            <AlertDescription>{deviceWarning}</AlertDescription>
          </Alert>
        )}
        <RoomStage sessionId={sessionId} title={title} role={grant.role} viewerId={viewerId} kind={grant.kind} endsAt={grant.endsAt} startedAt={grant.startedAt} hostName={hostName} onMeetingOver={markEnded} />
      </LiveKitRoom>
    );
  }

  const outcome = phase.name === "outcome" ? OUTCOME[phase.outcome] : phase.name === "error" ? { title: "Something went wrong", description: phase.message, rejoin: true } : null;
  if (outcome) {
    return (
      <div className="glass-regular rounded-card" role="status">
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
              : kind === "one_to_one"
                ? "Your mentor will see and hear you. Meetings aren't recorded."
                : "Everyone in the batch can see and hear you when your camera and microphone are on. You can unmute any time to speak. Meetings aren't recorded."}
        </p>
      </div>
      <PrejoinPreview name={viewerName} choice={devices} onChange={setDevices} />
      <p className="text-[13px] text-ink-secondary">
        Your browser will ask to use your camera and microphone. You can still join if you say no.
      </p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[14px] text-ink">
          You&apos;ll join as <strong className="font-semibold">{viewerName}</strong>
          <span className="block text-[12px] text-ink-secondary">The name on your profile is what everyone in the room sees.</span>
        </p>
        <Button type="button" className="min-h-11" onClick={enter} disabled={pending}>
          {pending ? "Connecting…" : isHost ? "Start or rejoin meeting" : "Join meeting"}
        </Button>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  RoomAudioRenderer,
  VideoTrack,
  isTrackReference,
  useConnectionState,
  useIsSpeaking,
  useLocalParticipant,
  useLocalParticipantPermissions,
  useParticipants,
  useRoomContext,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { ConnectionState, Track, type Participant } from "livekit-client";
import { Mic, MicOff, MonitorUp, MoreHorizontal, PhoneOff, Users, Video, VideoOff } from "lucide-react";
import { cn } from "cn";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { endMeetingAction, moderateParticipantAction } from "@/lib/actions/meetings";

// @livekit/protocol TrackSource values, as found in participant permissions.
const SOURCE = { camera: 1, microphone: 2, screen: 3 } as const;

type Perm = { canPublish?: boolean; canPublishSources?: number[] } | undefined;
const allows = (perm: Perm, source: number) => Boolean(perm?.canPublish) && (!perm?.canPublishSources?.length || perm.canPublishSources.includes(source));

// From the server-signed token metadata (never client-set: canUpdateOwnMetadata is off).
function roleOf(p: Participant): "mentor" | "admin" | "student" {
  try {
    const role = (JSON.parse(p.metadata ?? "{}") as { role?: string }).role;
    return role === "mentor" || role === "admin" ? role : "student";
  } catch {
    return "student";
  }
}
const isHostRole = (p: Participant) => roleOf(p) !== "student";

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

function Tile({ trackRef, large }: { trackRef: TrackReferenceOrPlaceholder; large?: boolean }) {
  const p = trackRef.participant;
  const speaking = useIsSpeaking(p);
  const name = p.name || "Participant";
  const showVideo = isTrackReference(trackRef) && !trackRef.publication.isMuted;
  const isScreen = trackRef.source === Track.Source.ScreenShare;
  return (
    <figure
      className={cn(
        "relative m-0 flex aspect-video items-center justify-center overflow-hidden rounded-card bg-ink outline-2 outline-offset-2",
        speaking && !isScreen ? "outline-brand-accent" : "outline-transparent",
        large && "w-full",
      )}
    >
      {showVideo ? (
        <VideoTrack trackRef={trackRef} className={cn("size-full", isScreen ? "object-contain" : "object-cover")} />
      ) : (
        <span aria-hidden="true" className={cn("flex items-center justify-center rounded-full bg-ink-secondary font-semibold text-white", large ? "size-24 text-[28px]" : "size-12 text-[15px]")}>
          {initials(name)}
        </span>
      )}
      <figcaption className="absolute bottom-2 left-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-pill bg-ink/70 px-2.5 py-1 text-[12px] text-white">
        {!isScreen && (p.isMicrophoneEnabled ? <Mic aria-hidden="true" size={12} /> : <MicOff aria-hidden="true" size={12} />)}
        <span className="truncate">
          {isScreen ? `${name}'s screen` : name}
          {p.isLocal ? " (you)" : ""}
        </span>
        <span className="sr-only">{isScreen ? "" : p.isMicrophoneEnabled ? (speaking ? ", speaking" : ", microphone on") : ", muted"}</span>
      </figcaption>
    </figure>
  );
}

function RosterRow({ p, isHost, canModerate, kind, onAction }: { p: Participant; isHost: boolean; canModerate: boolean; kind: "one_to_one" | "batch"; onAction: (id: string, name: string, action: "allow_audio" | "allow_video" | "revoke" | "mute" | "remove") => void }) {
  const speaking = useIsSpeaking(p);
  const name = p.name || "Participant";
  const perm = p.permissions as Perm;
  const canSpeak = allows(perm, SOURCE.microphone);
  const canVideo = allows(perm, SOURCE.camera);
  return (
    <li className="flex min-h-11 items-center justify-between gap-2 px-4 py-2">
      <span className="min-w-0">
        <span className="block truncate text-sm text-ink">
          {name}
          {p.isLocal ? " (you)" : ""}
        </span>
        <span className="block text-[12px] text-ink-secondary">
          {isHost ? (roleOf(p) === "admin" ? "Co-host (academy)" : "Host") : kind === "batch" ? (canVideo ? "Can speak and share video" : canSpeak ? "Can speak" : "Listening") : "Student"}
          {speaking ? " · Speaking" : ""}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <span className="inline-flex size-8 items-center justify-center text-ink-secondary" aria-label={p.isMicrophoneEnabled ? "Microphone on" : "Muted"} role="img">
          {p.isMicrophoneEnabled ? <Mic aria-hidden="true" size={16} className={speaking ? "text-brand-accent" : undefined} /> : <MicOff aria-hidden="true" size={16} />}
        </span>
        <span className="inline-flex size-8 items-center justify-center text-ink-secondary" aria-label={p.isCameraEnabled ? "Camera on" : "Camera off"} role="img">
          {p.isCameraEnabled ? <Video aria-hidden="true" size={16} /> : <VideoOff aria-hidden="true" size={16} />}
        </span>
        {canModerate && !isHost && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Actions for ${name}`}>
                <MoreHorizontal aria-hidden="true" size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {kind === "batch" && !canSpeak && <DropdownMenuItem onSelect={() => onAction(p.identity, name, "allow_audio")}>Allow to speak</DropdownMenuItem>}
              {kind === "batch" && !canVideo && <DropdownMenuItem onSelect={() => onAction(p.identity, name, "allow_video")}>Allow to speak and share video</DropdownMenuItem>}
              {kind === "batch" && (canSpeak || canVideo) && <DropdownMenuItem onSelect={() => onAction(p.identity, name, "revoke")}>Stop speaking and video</DropdownMenuItem>}
              {p.isMicrophoneEnabled && <DropdownMenuItem onSelect={() => onAction(p.identity, name, "mute")}>Mute microphone</DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => onAction(p.identity, name, "remove")}>
                Remove from meeting
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </span>
    </li>
  );
}

function useSecondsUntil(iso: string): number {
  const [left, setLeft] = useState(() => Math.max(0, Math.round((Date.parse(iso) - Date.now()) / 1000)));
  useEffect(() => {
    const timer = setInterval(() => setLeft(Math.max(0, Math.round((Date.parse(iso) - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [iso]);
  return left;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

interface RoomStageProps {
  sessionId: string;
  title: string;
  role: "mentor" | "admin" | "student";
  kind: "one_to_one" | "batch";
  endsAt: string;
}

// Host-led layout: the mentor (or their screen share) is the main video. In a
// batch meeting only students the mentor allowed can publish, so students never
// receive a wall of 100 videos — just the mentor and whoever has the floor.
export function RoomStage({ sessionId, title, role, kind, endsAt }: RoomStageProps) {
  const room = useRoomContext();
  const connection = useConnectionState();
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const perm = useLocalParticipantPermissions() as Perm;
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const [notice, setNotice] = useState<{ tone: "status" | "alert"; text: string } | null>(null);
  const [confirm, setConfirm] = useState<null | { kind: "end" } | { kind: "remove"; id: string; name: string }>(null);
  const [busy, setBusy] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const secondsLeft = useSecondsUntil(endsAt);
  const endedRef = useRef(false);

  const canMic = allows(perm, SOURCE.microphone);
  const canCamera = allows(perm, SOURCE.camera);
  const canScreen = allows(perm, SOURCE.screen);

  // Tell a batch student when the mentor gives or takes the floor.
  const prevCanMic = useRef(canMic);
  useEffect(() => {
    if (role === "student" && kind === "batch" && prevCanMic.current !== canMic) {
      setNotice({ tone: "status", text: canMic ? "The host let you speak. Turn on your microphone when you're ready." : "The host has closed your microphone." });
    }
    prevCanMic.current = canMic;
  }, [canMic, kind, role]);

  // Hard stop at the scheduled end: a host's client ends the meeting for
  // everyone; a student's client leaves. The server refuses new tokens anyway.
  useEffect(() => {
    if (secondsLeft > 0 || endedRef.current) return;
    endedRef.current = true;
    if (role !== "student") void endMeetingAction(sessionId).finally(() => room.disconnect());
    else void room.disconnect();
  }, [role, room, secondsLeft, sessionId]);

  const host = participants.find(isHostRole);
  const { main, strip } = useMemo(() => {
    const screen = tracks.find((t) => t.source === Track.Source.ScreenShare && isTrackReference(t));
    const cams = tracks.filter((t) => t.source === Track.Source.Camera);
    // The main view: a screen share, else the mentor, else an academy co-host.
    const mentorCam = cams.find((t) => roleOf(t.participant) === "mentor") ?? cams.find((t) => roleOf(t.participant) === "admin");
    const hostCams = cams.filter((t) => isHostRole(t.participant) && t !== mentorCam);
    const students = cams.filter((t) => !isHostRole(t.participant));
    // One-to-one: everyone gets a tile. Batch: only students who are actually
    // publishing video (a host allowed them), plus your own tile if you are.
    const visibleStudents = kind === "one_to_one" ? students : students.filter((t) => isTrackReference(t) && !t.publication.isMuted);
    const mainTrack = screen ?? mentorCam ?? null;
    const stripTracks = [...(screen && mentorCam ? [mentorCam] : []), ...hostCams, ...visibleStudents];
    return { main: mainTrack, strip: stripTracks };
  }, [kind, tracks]);

  async function toggle(what: "mic" | "camera" | "screen") {
    try {
      if (what === "mic") await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
      if (what === "camera") await localParticipant.setCameraEnabled(!isCameraEnabled);
      if (what === "screen") await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    } catch (error) {
      const denied = (error as Error)?.name === "NotAllowedError";
      const device = what === "mic" ? "microphone" : what === "camera" ? "camera" : "screen sharing";
      setNotice({ tone: "alert", text: denied ? `Your browser blocked the ${device}. Allow it in the site settings and try again.` : `We couldn't turn on your ${device}.` });
    }
  }

  async function moderate(id: string, name: string, action: "allow_audio" | "allow_video" | "revoke" | "mute" | "remove") {
    if (action === "remove") {
      setConfirm({ kind: "remove", id, name });
      return;
    }
    const result = await moderateParticipantAction(sessionId, id, action).catch(() => null);
    setNotice(result?.ok ? { tone: "status", text: `Updated ${name}.` } : { tone: "alert", text: result?.error?.message ?? "We couldn't reach the server. Try again." });
  }

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === "end") {
        const result = await endMeetingAction(sessionId);
        if (!result.ok) {
          setNotice({ tone: "alert", text: result.error?.message ?? "We couldn't end the meeting." });
          return;
        }
        endedRef.current = true;
        await room.disconnect();
      } else {
        const result = await moderateParticipantAction(sessionId, confirm.id, "remove");
        setNotice(result.ok ? { tone: "status", text: `${confirm.name} was removed and can't rejoin.` } : { tone: "alert", text: result.error?.message ?? "We couldn't remove them." });
      }
    } catch {
      setNotice({ tone: "alert", text: "We couldn't reach the server. Try again." });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const controlClass = "min-h-11 min-w-11";
  return (
    <div className="flex flex-col gap-4">
      <RoomAudioRenderer />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-ink-secondary">
          <span className="inline-flex items-center gap-1.5 text-ink">
            <span aria-hidden="true" className="size-2 rounded-full bg-success" />
            Live
          </span>
          {` · ${participants.length} in the room · ${secondsLeft > 0 ? `${mmss(secondsLeft)} left` : "Ending"}`}
        </p>
        <Button type="button" variant="outline" className="min-h-11 lg:hidden" aria-expanded={rosterOpen} aria-controls="meeting-roster" onClick={() => setRosterOpen((v) => !v)}>
          <Users aria-hidden="true" size={16} />
          Participants ({participants.length})
        </Button>
      </div>

      {connection === ConnectionState.Reconnecting && (
        <Alert role="status">
          <AlertDescription>Connection lost. Reconnecting…</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert variant={notice.tone === "alert" ? "destructive" : "default"} role={notice.tone}>
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <h2 className="sr-only">{title} — video</h2>
          {main ? (
            <Tile trackRef={main} large />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-card bg-ink px-6 text-center text-sm text-white">
              {host ? "The host's camera is off." : "Waiting for the host to join…"}
            </div>
          )}
          {strip.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {strip.map((t) => (
                <Tile key={`${t.participant.identity}-${t.source}`} trackRef={t} />
              ))}
            </div>
          )}
          <div role="toolbar" aria-label="Meeting controls" className="glass-regular flex flex-wrap items-center justify-center gap-2 rounded-panel px-4 py-3">
            {canMic ? (
              <Button type="button" variant={isMicrophoneEnabled ? "outline" : "secondary"} className={controlClass} aria-pressed={isMicrophoneEnabled} onClick={() => toggle("mic")}>
                {isMicrophoneEnabled ? <Mic aria-hidden="true" size={16} /> : <MicOff aria-hidden="true" size={16} />}
                {isMicrophoneEnabled ? "Mute" : "Unmute"}
              </Button>
            ) : (
              <span className="px-2 text-[13px] text-ink-secondary">You&apos;re listening. Your mentor can let you speak.</span>
            )}
            {canCamera && (
              <Button type="button" variant={isCameraEnabled ? "outline" : "secondary"} className={controlClass} aria-pressed={isCameraEnabled} onClick={() => toggle("camera")}>
                {isCameraEnabled ? <Video aria-hidden="true" size={16} /> : <VideoOff aria-hidden="true" size={16} />}
                {isCameraEnabled ? "Stop video" : "Start video"}
              </Button>
            )}
            {canScreen && (
              <Button type="button" variant="outline" className={controlClass} aria-pressed={isScreenShareEnabled} onClick={() => toggle("screen")}>
                <MonitorUp aria-hidden="true" size={16} />
                {isScreenShareEnabled ? "Stop sharing" : "Share screen"}
              </Button>
            )}
            <Button type="button" variant="outline" className={controlClass} onClick={() => room.disconnect()}>
              <PhoneOff aria-hidden="true" size={16} />
              Leave
            </Button>
            {role !== "student" && (
              <Button type="button" variant="destructive" className={controlClass} onClick={() => setConfirm({ kind: "end" })}>
                End meeting for all
              </Button>
            )}
          </div>
        </div>

        <aside id="meeting-roster" aria-label="Participants" className={cn("glass-regular flex-col rounded-card lg:flex", rosterOpen ? "flex" : "hidden")}>
          <h2 className="px-4 pt-4 pb-2 text-[13px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">Participants ({participants.length})</h2>
          <ul className="flex max-h-[60vh] flex-col divide-y divide-hairline overflow-y-auto pb-2">
            {[...participants]
              .sort((a, b) => Number(isHostRole(b)) - Number(isHostRole(a)) || (a.name ?? "").localeCompare(b.name ?? ""))
              .map((p) => (
                <RosterRow key={p.identity} p={p} isHost={isHostRole(p)} canModerate={role !== "student"} kind={kind} onAction={moderate} />
              ))}
          </ul>
        </aside>
      </div>

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && !busy && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm?.kind === "end" ? "End the meeting for everyone?" : `Remove ${confirm?.kind === "remove" ? confirm.name : ""}?`}</DialogTitle>
            <DialogDescription>
              {confirm?.kind === "end" ? "Everyone is disconnected and the meeting moves to Past. Attendance is saved." : "They're disconnected and can't rejoin this meeting."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setConfirm(null)} disabled={busy}>
              Keep going
            </Button>
            <Button type="button" variant="destructive" className="min-h-11" onClick={runConfirm} disabled={busy}>
              {busy ? "Working…" : confirm?.kind === "end" ? "End meeting" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

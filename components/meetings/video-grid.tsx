"use client";

import { useState } from "react";
import { VideoTrack, isTrackReference, useConnectionQualityIndicator, useIsSpeaking, type TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { ConnectionQuality, Track } from "livekit-client";
import { ChevronLeft, ChevronRight, Crown, Hand, Mic, MicOff, MonitorUp, Pin, WifiOff } from "lucide-react";
import { cn } from "cn";
import { handRaised, initials, isHostRole, roleOf } from "@/components/meetings/participant-utils";
import { featuredIdentity, orderForGrid, pageCount } from "@/lib/meetings/room-logic";

const PER_PAGE = 9;
// Speaker view shows this many others beside the main tile; the rest are in gallery view.
const STRIP = 6;

export type StageLayout = "gallery" | "speaker";

function Tile({ trackRef, featured, pinned }: { trackRef: TrackReferenceOrPlaceholder; featured?: boolean; pinned?: boolean }) {
  const p = trackRef.participant;
  const speaking = useIsSpeaking(p);
  const { quality } = useConnectionQualityIndicator({ participant: p });
  const name = p.name || "Participant";
  const isScreen = trackRef.source === Track.Source.ScreenShare;
  const showVideo = isTrackReference(trackRef) && !trackRef.publication.isMuted;
  const host = isHostRole(p);
  const hand = handRaised(p);
  const weak = quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost;
  return (
    <figure
      className={cn(
        "relative m-0 flex aspect-video min-w-0 items-center justify-center overflow-hidden rounded-card bg-ink outline-2 -outline-offset-2",
        speaking && !isScreen ? "outline-brand-accent" : host && !isScreen ? "outline-ink-secondary" : "outline-transparent",
      )}
    >
      {showVideo ? (
        <VideoTrack trackRef={trackRef} className={cn("size-full", isScreen ? "object-contain" : "object-cover")} />
      ) : (
        <span aria-hidden="true" className={cn("flex items-center justify-center rounded-full bg-ink-secondary font-semibold text-white", featured ? "size-24 text-[28px]" : "size-14 text-[16px]")}>
          {initials(name)}
        </span>
      )}
      {pinned && (
        <span className="absolute top-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-pill bg-ink/70 px-2 py-0.5 text-[12px] text-white">
          <Pin aria-hidden="true" size={12} /> Pinned
        </span>
      )}
      {hand && !isScreen && (
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-pill bg-warning px-2 py-0.5 text-[12px] font-semibold text-ink">
          <Hand aria-hidden="true" size={12} /> Hand raised
        </span>
      )}
      {weak && !isScreen && (
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-pill bg-ink/70 px-2 py-0.5 text-[12px] text-white">
          <WifiOff aria-hidden="true" size={12} /> {quality === ConnectionQuality.Lost ? "Reconnecting" : "Weak connection"}
        </span>
      )}
      <figcaption className="absolute bottom-2 left-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-pill bg-ink/70 px-2.5 py-1 text-[12px] text-white">
        {isScreen ? <MonitorUp aria-hidden="true" size={12} /> : host ? <Crown aria-hidden="true" size={12} /> : null}
        {!isScreen && (p.isMicrophoneEnabled ? <Mic aria-hidden="true" size={12} /> : <MicOff aria-hidden="true" size={12} />)}
        <span className="truncate">
          {isScreen ? `${name}'s screen` : name}
          {host && !isScreen ? (roleOf(p) === "admin" ? " (Co-host)" : " (Host)") : ""}
          {p.isLocal ? " · you" : ""}
        </span>
        <span className="sr-only">{isScreen ? "" : p.isMicrophoneEnabled ? (speaking ? ", speaking" : ", microphone on") : ", muted"}</span>
      </figcaption>
    </figure>
  );
}

// In speaker view, a tile is a button: choosing it pins that person to the
// main tile (choosing the pinned one again unpins).
function PinnableTile({ trackRef, pinned, onPin, featured }: { trackRef: TrackReferenceOrPlaceholder; pinned: boolean; onPin: (identity: string | null) => void; featured?: boolean }) {
  const name = trackRef.participant.name || "Participant";
  return (
    <button
      type="button"
      onClick={() => onPin(pinned ? null : trackRef.participant.identity)}
      aria-pressed={pinned}
      aria-label={pinned ? `Unpin ${name}` : `Pin ${name} to the main view`}
      title={pinned ? "Unpin" : "Pin to the main view"}
      className="block w-full min-w-0 rounded-card text-left focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none"
    >
      <Tile trackRef={trackRef} pinned={pinned} featured={featured} />
    </button>
  );
}

interface VideoGridProps {
  tracks: TrackReferenceOrPlaceholder[]; // camera (with placeholders) + screen shares
  layout: StageLayout;
  // Speaker view: current speakers (loudest first), the last remote speaker, and a pin.
  speaking: string[];
  lastSpeaker: string | null;
  pinned: string | null;
  onPin: (identity: string | null) => void;
}

// session_ref.png centre: a paged grid of everyone in the room (host first,
// raised hands next). Students who aren't allowed to publish show their
// initials, so a batch room never streams 100 videos. A screen share takes the
// main area with the cameras in a strip beside it.
export function VideoGrid({ tracks, layout, speaking, lastSpeaker, pinned, onPin }: VideoGridProps) {
  const [page, setPage] = useState(0);
  const screen = tracks.find((t) => t.source === Track.Source.ScreenShare && isTrackReference(t));
  const cameras = orderForGrid(
    tracks
      .filter((t) => t.source === Track.Source.Camera)
      .map((t) => ({ t, identity: t.participant.identity, name: t.participant.name || "Participant", isHost: isHostRole(t.participant), handRaised: handRaised(t.participant), speaking: t.participant.isSpeaking, isLocal: t.participant.isLocal })),
  ).map((x) => x.t);

  if (screen) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
        <div className="min-w-0 flex-1">
          <Tile trackRef={screen} featured />
        </div>
        <div className="grid grid-cols-3 gap-2 lg:w-48 lg:grid-cols-1 lg:content-start">
          {cameras.slice(0, 4).map((t) => (
            <Tile key={`${t.participant.identity}-cam`} trackRef={t} />
          ))}
        </div>
      </div>
    );
  }

  if (layout === "speaker" && cameras.length > 1) {
    const mainId = featuredIdentity({ people: cameras.map((t) => ({ identity: t.participant.identity, isHost: isHostRole(t.participant), isLocal: t.participant.isLocal })), pinned, speaking, lastSpeaker });
    const main = cameras.find((t) => t.participant.identity === mainId) ?? cameras[0];
    const others = cameras.filter((t) => t !== main);
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="mx-auto w-full max-w-4xl">
          <PinnableTile trackRef={main} pinned={pinned === main.participant.identity} onPin={onPin} featured />
        </div>
        <ul aria-label="Others in the room" className="flex gap-2 overflow-x-auto pb-1">
          {others.slice(0, STRIP).map((t) => (
            <li key={`${t.participant.identity}-cam`} className="w-36 shrink-0 sm:w-44">
              <PinnableTile trackRef={t} pinned={false} onPin={onPin} />
            </li>
          ))}
          {others.length > STRIP && (
            <li className="flex w-36 shrink-0 items-center justify-center rounded-card bg-ink-secondary/30 px-2 text-center text-[12px] text-white sm:w-44">
              +{others.length - STRIP} more in gallery view
            </li>
          )}
        </ul>
      </div>
    );
  }

  const pages = pageCount(cameras.length, PER_PAGE);
  const current = Math.min(page, pages - 1);
  const shown = cameras.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE);
  const cols = shown.length <= 1 ? "grid-cols-1" : shown.length <= 4 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3";
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className={cn("grid flex-1 content-center gap-2", cols, shown.length === 1 && "mx-auto w-full max-w-3xl")}>
        {shown.map((t) => (
          <Tile key={`${t.participant.identity}-cam`} trackRef={t} featured={shown.length === 1} />
        ))}
      </div>
      {pages > 1 && (
        <nav aria-label="Video pages" className="flex items-center justify-center gap-3 text-[13px] text-white">
          <button type="button" className="inline-flex size-9 items-center justify-center rounded-full hover:bg-ink-secondary/40 disabled:opacity-40" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Previous page of participants">
            <ChevronLeft aria-hidden="true" size={18} />
          </button>
          <span>
            Page {current + 1} of {pages}
          </span>
          <button type="button" className="inline-flex size-9 items-center justify-center rounded-full hover:bg-ink-secondary/40 disabled:opacity-40" onClick={() => setPage(current + 1)} disabled={current >= pages - 1} aria-label="Next page of participants">
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        </nav>
      )}
    </div>
  );
}

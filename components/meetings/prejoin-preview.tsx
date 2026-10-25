"use client";

import { useEffect, useRef, useState } from "react";
import { createLocalAudioTrack, createLocalVideoTrack, type LocalAudioTrack, type LocalVideoTrack } from "livekit-client";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { DeviceSelect, useDeviceList } from "@/components/meetings/device-controls";
import { initials } from "@/components/meetings/participant-utils";
import { Button } from "@/components/ui/button";

export interface DeviceChoice {
  camera: boolean;
  mic: boolean;
  cameraId: string;
  micId: string;
}

function deviceProblem(error: unknown, device: "camera" | "microphone"): string {
  const name = (error as Error)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return `Your browser blocked the ${device}. Allow it from the address bar's site settings, then turn it on again.`;
  if (name === "NotFoundError" || name === "OverconstrainedError") return `We couldn't find a ${device} on this device.`;
  if (name === "NotReadableError" || name === "AbortError") return `Your ${device} is being used by another app.`;
  return `We couldn't start your ${device}.`;
}

// One local preview track for the join screen, stopped when turned off, when
// the device changes and when the join screen closes (before the room opens
// its own tracks). Nothing here is published.
function usePreviewTrack<T extends LocalVideoTrack | LocalAudioTrack>(enabled: boolean, deviceId: string, create: (id?: string) => Promise<T>, device: "camera" | "microphone") {
  const [state, setState] = useState<{ key: string; track: T | null; error: string | null }>({ key: "", track: null, error: null });
  const key = `${enabled}:${deviceId}`;
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let created: T | null = null;
    create(deviceId || undefined)
      .then((track) => {
        if (cancelled) return track.stop();
        created = track;
        setState({ key, track, error: null });
      })
      .catch((error) => !cancelled && setState({ key, track: null, error: deviceProblem(error, device) }));
    return () => {
      cancelled = true;
      created?.stop();
    };
  }, [create, device, deviceId, enabled, key]);
  // A result for an older choice (or a turned-off device) is never shown.
  return enabled && state.key === key ? state : { track: null, error: null };
}

const makeVideo = (deviceId?: string) => createLocalVideoTrack({ deviceId, resolution: { width: 640, height: 360 } });
const makeAudio = (deviceId?: string) => createLocalAudioTrack({ deviceId });

// A live input-level bar so people can see their microphone works before joining.
function MicLevel({ track }: { track: LocalAudioTrack }) {
  const bar = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(new MediaStream([track.mediaStreamTrack])).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let frame = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      if (bar.current) bar.current.style.width = `${Math.min(100, Math.round(Math.sqrt(sum / data.length) * 400))}%`;
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(frame);
      void ctx.close();
    };
  }, [track]);
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-pill bg-hairline" role="img" aria-label="Microphone input level">
      <span ref={bar} className="block h-full w-0 rounded-pill bg-success" />
    </span>
  );
}

interface PrejoinPreviewProps {
  name: string;
  choice: DeviceChoice;
  onChange: (choice: DeviceChoice) => void;
}

// Join screen: camera preview (or the placeholder others will see), mic level,
// device pickers and the name you'll appear under.
export function PrejoinPreview({ name, choice, onChange }: PrejoinPreviewProps) {
  const video = usePreviewTrack(choice.camera, choice.cameraId, makeVideo, "camera");
  const audio = usePreviewTrack(choice.mic, choice.micId, makeAudio, "microphone");
  const videoEl = useRef<HTMLVideoElement>(null);
  const cameras = useDeviceList("videoinput", video.track);
  const mics = useDeviceList("audioinput", audio.track);

  useEffect(() => {
    const el = videoEl.current;
    if (!el || !video.track) return;
    video.track.attach(el);
    return () => {
      video.track?.detach(el);
    };
  }, [video.track]);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-card bg-ink">
        {video.track ? (
          <video ref={videoEl} muted playsInline className="size-full -scale-x-100 object-cover" aria-label="Your camera preview" />
        ) : (
          <span aria-hidden="true" className="flex size-20 items-center justify-center rounded-full bg-ink-secondary text-[24px] font-semibold text-white">
            {initials(name)}
          </span>
        )}
        <span className="absolute bottom-2 left-2 rounded-pill bg-ink/70 px-2.5 py-1 text-[12px] text-white">{choice.camera ? (video.track ? "Camera preview" : "Starting camera…") : "Camera off — others see your initials"}</span>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-11 flex-1" aria-pressed={choice.camera} onClick={() => onChange({ ...choice, camera: !choice.camera })}>
            {choice.camera ? <Video aria-hidden="true" size={16} /> : <VideoOff aria-hidden="true" size={16} />}
            {choice.camera ? "Camera on" : "Camera off"}
          </Button>
          <Button type="button" variant="outline" className="min-h-11 flex-1" aria-pressed={choice.mic} onClick={() => onChange({ ...choice, mic: !choice.mic })}>
            {choice.mic ? <Mic aria-hidden="true" size={16} /> : <MicOff aria-hidden="true" size={16} />}
            {choice.mic ? "Microphone on" : "Microphone off"}
          </Button>
        </div>
        <DeviceSelect kind="videoinput" devices={cameras} value={choice.cameraId} onChange={(cameraId) => onChange({ ...choice, cameraId })} disabled={!choice.camera} />
        <DeviceSelect kind="audioinput" devices={mics} value={choice.micId} onChange={(micId) => onChange({ ...choice, micId })} disabled={!choice.mic} />
        {audio.track && <MicLevel track={audio.track} />}
        {(video.error || audio.error) && (
          <p role="alert" className="text-[13px] text-danger">
            {[video.error, audio.error].filter(Boolean).join(" ")} You can still join.
          </p>
        )}
      </div>
    </div>
  );
}

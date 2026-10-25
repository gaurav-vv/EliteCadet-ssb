"use client";

import { useEffect, useId, useState } from "react";
import { useMediaDeviceSelect } from "@livekit/components-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const KIND_LABEL: Record<MediaDeviceKind, string> = { audioinput: "Microphone", videoinput: "Camera", audiooutput: "Speaker" };

// Browsers only label devices after camera/mic permission; until then show a
// numbered name instead of a blank row.
const deviceName = (d: MediaDeviceInfo, i: number) => d.label || `${KIND_LABEL[d.kind]} ${i + 1}`;

// Choosing a speaker needs HTMLMediaElement.setSinkId (Chrome, Edge; not Safari or Firefox on mobile).
export const canChooseSpeaker = () => typeof window !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;

interface DeviceSelectProps {
  kind: MediaDeviceKind;
  devices: MediaDeviceInfo[];
  value: string;
  onChange: (deviceId: string) => void;
  disabled?: boolean;
}

export function DeviceSelect({ kind, devices, value, onChange, disabled }: DeviceSelectProps) {
  const id = useId();
  const usable = devices.filter((d) => d.deviceId);
  const current = usable.some((d) => d.deviceId === value) ? value : (usable[0]?.deviceId ?? "");
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="text-[13px] text-ink-secondary">
        {KIND_LABEL[kind]}
      </Label>
      <Select value={current || undefined} onValueChange={onChange} disabled={disabled || usable.length === 0}>
        <SelectTrigger id={id} className="min-h-11 w-full min-w-0">
          <SelectValue placeholder={usable.length === 0 ? `No ${KIND_LABEL[kind].toLowerCase()} found` : `Choose a ${KIND_LABEL[kind].toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {usable.map((d, i) => (
            <SelectItem key={d.deviceId} value={d.deviceId}>
              {deviceName(d, i)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Devices outside a room (the join screen). Re-reads after permission is
// granted (`refreshKey` changes) and when devices are plugged in or out.
export function useDeviceList(kind: MediaDeviceKind, refreshKey: unknown): MediaDeviceInfo[] {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => {
    const media = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!media?.enumerateDevices) return;
    let cancelled = false;
    const read = () =>
      media
        .enumerateDevices()
        .then((all) => !cancelled && setDevices(all.filter((d) => d.kind === kind)))
        .catch(() => undefined);
    void read();
    media.addEventListener?.("devicechange", read);
    return () => {
      cancelled = true;
      media.removeEventListener?.("devicechange", read);
    };
  }, [kind, refreshKey]);
  return devices;
}

function InRoomSelect({ kind, onError }: { kind: MediaDeviceKind; onError: (message: string) => void }) {
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind, requestPermissions: false });
  return (
    <DeviceSelect
      kind={kind}
      devices={devices}
      value={activeDeviceId}
      onChange={(id) => setActiveMediaDevice(id).catch(() => onError(`We couldn't switch to that ${KIND_LABEL[kind].toLowerCase()}. Try another one.`))}
    />
  );
}

// Inside a LiveKit room: switching applies to the live tracks immediately.
export function InRoomDeviceSettings({ onError }: { onError: (message: string) => void }) {
  // Rendered only after the room connects (never during SSR), so this is safe to read once.
  const [speaker] = useState(canChooseSpeaker);
  return (
    <div className="flex flex-col gap-4">
      <InRoomSelect kind="audioinput" onError={onError} />
      <InRoomSelect kind="videoinput" onError={onError} />
      {speaker ? <InRoomSelect kind="audiooutput" onError={onError} /> : <p className="text-[13px] text-ink-secondary">This browser plays sound through your system&apos;s default speaker.</p>}
    </div>
  );
}

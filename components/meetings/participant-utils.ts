import type { Participant } from "livekit-client";

// @livekit/protocol TrackSource values, as found in participant permissions.
export const SOURCE = { camera: 1, microphone: 2, screen: 3 } as const;

export type Perm = { canPublish?: boolean; canPublishSources?: number[] } | undefined;

export const allows = (perm: Perm, source: number) => Boolean(perm?.canPublish) && (!perm?.canPublishSources?.length || perm.canPublishSources.includes(source));

// From the server-signed token metadata (never client-set: canUpdateOwnMetadata is off).
export function roleOf(p: Participant): "mentor" | "admin" | "student" {
  try {
    const role = (JSON.parse(p.metadata ?? "{}") as { role?: string }).role;
    return role === "mentor" || role === "admin" ? role : "student";
  } catch {
    return "student";
  }
}

export const isHostRole = (p: Participant) => roleOf(p) !== "student";

// Raised hands are a participant attribute only the server sets (0025 / setHandRaised).
export const handRaised = (p: Participant) => p.attributes?.hand === "raised";

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

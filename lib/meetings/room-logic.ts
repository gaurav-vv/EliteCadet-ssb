// Pure meeting-room rules shared by the room UI (components/meetings) and its
// tests (tests/unit/lib/meeting-room-logic.test.ts). No React, no LiveKit I/O.

// LiveKit DisconnectReason values we act on (livekit-client re-exports the
// @livekit/protocol enum; numbers are stable protocol values).
export const REASON = { CLIENT_INITIATED: 1, DUPLICATE_IDENTITY: 2, PARTICIPANT_REMOVED: 4, ROOM_DELETED: 5 } as const;

export type RoomOutcome = "ended" | "left" | "removed" | "duplicate" | "lost";

// What the person sees after their connection closes. `endedHere` is set
// BEFORE this client disconnects whenever the meeting is over for everyone
// (the host ended it here, or the scheduled end passed), so the outcome never
// depends on which disconnect reason happens to arrive first — the original
// End Meeting bug showed "You left — rejoin" for a meeting that had ended.
export function disconnectOutcome(reason: number | undefined, endedHere: boolean): RoomOutcome {
  if (endedHere || reason === REASON.ROOM_DELETED) return "ended";
  if (reason === REASON.PARTICIPANT_REMOVED) return "removed";
  if (reason === REASON.DUPLICATE_IDENTITY) return "duplicate";
  if (reason === REASON.CLIENT_INITIATED) return "left";
  return "lost";
}

export interface ChatItem {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  at: string;
  // Local-only states for your own messages.
  pending?: boolean;
  failed?: boolean;
}

export type IncomingMessage =
  | { type: "chat"; id: string; senderId: string; senderName: string; body: string; at: string }
  | { type: "reaction"; senderId: string; senderName: string; emoji: string; at: string };

const str = (v: unknown, max: number) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);

// Data from the room is only ever sent by our server, but it is still parsed
// defensively: anything malformed is dropped.
export function parseRoomMessage(bytes: Uint8Array): IncomingMessage | null {
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const senderId = str(r.senderId, 64);
  const senderName = str(r.senderName, 120) ?? "Participant";
  const at = str(r.at, 40);
  if (!senderId || !at || Number.isNaN(Date.parse(at))) return null;
  if (r.type === "chat") {
    const id = str(r.id, 64);
    const body = str(r.body, 1000);
    return id && body ? { type: "chat", id, senderId, senderName, body, at } : null;
  }
  if (r.type === "reaction") {
    const emoji = str(r.emoji, 16);
    return emoji ? { type: "reaction", senderId, senderName, emoji, at } : null;
  }
  return null;
}

// History + live messages + your own pending ones → one list, oldest first,
// each server id once. A pending local copy is replaced by the stored row.
export function mergeMessages(current: ChatItem[], incoming: ChatItem[], replaceLocalId?: string): ChatItem[] {
  const byId = new Map<string, ChatItem>();
  for (const m of current) if (m.id !== replaceLocalId) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id));
}

export interface GridPerson {
  identity: string;
  name: string;
  isHost: boolean;
  handRaised: boolean;
  speaking: boolean;
  isLocal: boolean;
}

// Host(s) first, then raised hands, then whoever is speaking, then by name.
export function orderForGrid<T extends GridPerson>(people: T[]): T[] {
  return [...people].sort(
    (a, b) =>
      Number(b.isHost) - Number(a.isHost) ||
      Number(b.handRaised) - Number(a.handRaised) ||
      Number(b.speaking) - Number(a.speaking) ||
      a.name.localeCompare(b.name) ||
      a.identity.localeCompare(b.identity),
  );
}

export function pageCount(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(total / perPage));
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? `${String(h).padStart(2, "0")}:` : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

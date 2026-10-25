// LiveKit (WebRTC SFU) access for live meeting rooms — T094, specs.md §8a.4h.
// Server-only: the API secret never leaves this file's process. Imported by
// lib/server/meetings/service.ts and the webhook route, never by a
// "use client" file.

import { AccessToken, DataPacket_Kind, RoomServiceClient, TrackSource, TrackType, WebhookReceiver, type VideoGrant } from "livekit-server-sdk";
import type { MeetingKind } from "@/types/sessions";

export interface LiveKitConfig {
  // wss://… for browsers; the REST client derives https://… from it.
  url: string;
  apiKey: string;
  apiSecret: string;
}

// Names of the server-side variables that are unset — names only, never values.
export function missingLiveKitConfig(): string[] {
  return ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"].filter((name) => !process.env[name]);
}

// Values that are set but can't work — names and reasons only, never values.
// The classic case: a secret copied from the LiveKit Cloud dashboard while it
// was still masked ("••••…"). Every token signed with it is rejected by
// LiveKit as "invalid token", so it's treated as not configured instead.
export function invalidLiveKitConfig(env: Record<string, string | undefined> = process.env): string[] {
  const problems: string[] = [];
  const url = env.LIVEKIT_URL;
  if (url && !/^(wss?|https?):\/\/[^\s/]+/.test(url)) problems.push("LIVEKIT_URL must start with wss:// (or ws:// locally)");
  for (const name of ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"]) {
    const value = env[name];
    if (!value) continue;
    if (!/^[\x21-\x7e]+$/.test(value)) problems.push(`${name} has spaces or non-ASCII characters (was a masked value copied from the dashboard instead of the real one?)`);
    else if (new Set(value).size === 1) problems.push(`${name} is a placeholder (one repeated character)`);
  }
  return problems;
}

let reportedProblems = "";

export function liveKitConfig(): LiveKitConfig | null {
  if (typeof window !== "undefined") throw new Error("LiveKit server config must never be read in the browser.");
  if (missingLiveKitConfig().length > 0) return null;
  const problems = invalidLiveKitConfig();
  if (problems.length > 0) {
    const summary = problems.join("; ");
    if (summary !== reportedProblems) console.error(`[meetings] LiveKit is not usable: ${summary}. See docs/live-meetings.md → Troubleshooting.`);
    reportedProblems = summary;
    return null;
  }
  return { url: process.env.LIVEKIT_URL!, apiKey: process.env.LIVEKIT_API_KEY!, apiSecret: process.env.LIVEKIT_API_SECRET! };
}

// For server logs: a 401 from LiveKit means the key/secret pair is wrong, not
// that the service is down. Never includes credential values.
export function describeProviderError(error: unknown): string {
  const e = error as { status?: number; message?: string } | null;
  if (e?.status === 401 || /invalid token|unauthorized/i.test(e?.message ?? "")) {
    return `${e?.message ?? "unauthorized"} — LiveKit rejected the credentials: LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be the same key pair from the project LIVEKIT_URL points to`;
  }
  return e?.message ?? "unknown";
}

function httpUrl(wsUrl: string): string {
  return wsUrl.replace(/^ws(s?):\/\//, "http$1://");
}

// One room per session, named after it. Clients never choose a room name.
export const roomNameFor = (sessionId: string) => `session-${sessionId}`;

const ROOM_RE = /^session-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
export function sessionIdFromRoom(room: string | undefined): string | null {
  return room ? (ROOM_RE.exec(room)?.[1] ?? null) : null;
}

// "admin" = an academy admin of the meeting's academy, joining as co-host.
export type ParticipantRole = "mentor" | "admin" | "student";
// What a batch-meeting student may publish; the mentor changes it live.
export type PublishLevel = "none" | "audio" | "audio_video";

function sourcesFor(role: ParticipantRole, kind: MeetingKind, level?: PublishLevel): TrackSource[] {
  if (role !== "student") return [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO];
  const effective = level ?? (kind === "one_to_one" ? "audio_video" : "none");
  if (effective === "audio_video") return [TrackSource.CAMERA, TrackSource.MICROPHONE];
  if (effective === "audio") return [TrackSource.MICROPHONE];
  return [];
}

// A short-lived token for exactly one room. Identity is the authenticated
// user id (never client input). No chat/data channel, no room admin, no
// recording. A batch student joins listen-only until the mentor allows them.
export async function createJoinToken(cfg: LiveKitConfig, input: { sessionId: string; userId: string; name: string; role: ParticipantRole; kind: MeetingKind }): Promise<string> {
  const sources = sourcesFor(input.role, input.kind);
  const token = new AccessToken(cfg.apiKey, cfg.apiSecret, {
    identity: input.userId,
    name: input.name,
    ttl: "10m",
    metadata: JSON.stringify({ role: input.role }),
  });
  const grant: VideoGrant = {
    room: roomNameFor(input.sessionId),
    roomJoin: true,
    canSubscribe: true,
    canPublish: sources.length > 0,
    canPublishSources: sources,
    canPublishData: false,
    canUpdateOwnMetadata: false,
  };
  token.addGrant(grant);
  return token.toJwt();
}

// Every server→LiveKit call is bounded: a hung video service must surface as
// an error the host can retry (End meeting, moderation), never a spinner.
const REQUEST_TIMEOUT_SECONDS = 6;

function rooms(cfg: LiveKitConfig) {
  return new RoomServiceClient(httpUrl(cfg.url), cfg.apiKey, cfg.apiSecret, { requestTimeout: REQUEST_TIMEOUT_SECONDS });
}

// Created by the mentor's start, with a hard participant cap (students + the
// mentor). Idempotent on LiveKit's side: an existing room is returned.
export async function ensureRoom(cfg: LiveKitConfig, sessionId: string, maxParticipants: number): Promise<void> {
  await rooms(cfg).createRoom({ name: roomNameFor(sessionId), maxParticipants, emptyTimeout: 10 * 60, departureTimeout: 2 * 60 });
}

// Ends the call for everyone. A room that is already gone is fine.
export async function closeRoom(cfg: LiveKitConfig, sessionId: string): Promise<void> {
  try {
    await rooms(cfg).deleteRoom(roomNameFor(sessionId));
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}

export async function setPublishLevel(cfg: LiveKitConfig, sessionId: string, identity: string, kind: MeetingKind, level: PublishLevel): Promise<void> {
  const sources = sourcesFor("student", kind, level);
  await rooms(cfg).updateParticipant(roomNameFor(sessionId), identity, {
    permission: { canSubscribe: true, canPublish: sources.length > 0, canPublishSources: sources, canPublishData: false },
  });
}

// Mutes every microphone track the participant is publishing.
export async function muteAudio(cfg: LiveKitConfig, sessionId: string, identity: string): Promise<void> {
  const room = roomNameFor(sessionId);
  const client = rooms(cfg);
  const participant = await client.getParticipant(room, identity);
  await Promise.all(
    participant.tracks.filter((t) => t.type === TrackType.AUDIO && !t.muted).map((t) => client.mutePublishedTrack(room, identity, t.sid, true)),
  );
}

export async function removeFromRoom(cfg: LiveKitConfig, sessionId: string, identity: string): Promise<void> {
  try {
    await rooms(cfg).removeParticipant(roomNameFor(sessionId), identity);
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}

// Server-to-room messages (chat rows, reactions). Clients have no data-publish
// permission, so every message in a room was authorized and sent from here.
export type RoomMessage =
  | { type: "chat"; id: string; senderId: string; senderName: string; body: string; at: string }
  | { type: "reaction"; senderId: string; senderName: string; emoji: string; at: string };

export async function broadcast(cfg: LiveKitConfig, sessionId: string, message: RoomMessage): Promise<void> {
  await rooms(cfg).sendData(roomNameFor(sessionId), new TextEncoder().encode(JSON.stringify(message)), DataPacket_Kind.RELIABLE, { topic: message.type });
}

// Raised hand = a participant attribute every client sees (late joiners too).
// hand_at (server clock) lets the host see hands in the order they went up.
export async function setHandRaised(cfg: LiveKitConfig, sessionId: string, identity: string, raised: boolean): Promise<void> {
  await rooms(cfg).updateParticipant(roomNameFor(sessionId), identity, { attributes: { hand: raised ? "raised" : "", hand_at: raised ? new Date().toISOString() : "" } });
}

export async function connectedIdentities(cfg: LiveKitConfig, sessionId: string): Promise<{ identity: string; handRaised: boolean }[]> {
  try {
    const list = await rooms(cfg).listParticipants(roomNameFor(sessionId));
    return list.map((p) => ({ identity: p.identity, handRaised: p.attributes?.hand === "raised" }));
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
}

export function webhookReceiver(cfg: LiveKitConfig) {
  return new WebhookReceiver(cfg.apiKey, cfg.apiSecret);
}

function isNotFound(error: unknown): boolean {
  const e = error as { status?: number; code?: string } | null;
  return e?.status === 404 || e?.code === "not_found";
}

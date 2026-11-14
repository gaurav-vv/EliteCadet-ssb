// @vitest-environment node
import { describe, expect, it } from "vitest";
import { disconnectOutcome, featuredIdentity, formatClock, handQueue, mergeMessages, orderForGrid, pageCount, parseRoomMessage, REASON, type ChatItem } from "@/lib/meetings/room-logic";

const bytes = (v: unknown) => new TextEncoder().encode(typeof v === "string" ? v : JSON.stringify(v));

describe("disconnectOutcome — the End Meeting bug", () => {
  it("shows 'ended' when the meeting is over here, whatever reason arrives first", () => {
    // The host ended it / the scheduled end passed, then this client disconnected
    // itself: before the fix that read as "You left — rejoin".
    expect(disconnectOutcome(REASON.CLIENT_INITIATED, true)).toBe("ended");
    expect(disconnectOutcome(undefined, true)).toBe("ended");
    expect(disconnectOutcome(REASON.ROOM_DELETED, true)).toBe("ended");
  });

  it("shows 'ended' for everyone when the server deleted the room", () => {
    expect(disconnectOutcome(REASON.ROOM_DELETED, false)).toBe("ended");
  });

  it("keeps a participant's own Leave as 'left' (the meeting continues)", () => {
    expect(disconnectOutcome(REASON.CLIENT_INITIATED, false)).toBe("left");
  });

  it("distinguishes removal, a second tab, and a lost connection", () => {
    expect(disconnectOutcome(REASON.PARTICIPANT_REMOVED, false)).toBe("removed");
    expect(disconnectOutcome(REASON.DUPLICATE_IDENTITY, false)).toBe("duplicate");
    expect(disconnectOutcome(undefined, false)).toBe("lost");
    expect(disconnectOutcome(99, false)).toBe("lost");
  });
});

describe("parseRoomMessage", () => {
  const at = "2026-10-20T10:00:00.000Z";
  it("accepts well-formed chat and reaction messages", () => {
    expect(parseRoomMessage(bytes({ type: "chat", id: "m1", senderId: "u1", senderName: "Asha", body: "Hi", at }))).toEqual({ type: "chat", id: "m1", senderId: "u1", senderName: "Asha", body: "Hi", at });
    expect(parseRoomMessage(bytes({ type: "reaction", senderId: "u1", senderName: "Asha", emoji: "👏", at }))).toMatchObject({ type: "reaction", emoji: "👏" });
  });

  it("drops anything malformed or unknown", () => {
    expect(parseRoomMessage(bytes("not json"))).toBeNull();
    expect(parseRoomMessage(bytes({ type: "chat", senderId: "u1", body: "no id", at }))).toBeNull();
    expect(parseRoomMessage(bytes({ type: "chat", id: "m", senderId: "u1", body: "x".repeat(1001), at }))).toBeNull();
    expect(parseRoomMessage(bytes({ type: "chat", id: "m", senderId: "u1", body: "x", at: "nope" }))).toBeNull();
    expect(parseRoomMessage(bytes({ type: "poll", senderId: "u1", at }))).toBeNull();
    expect(parseRoomMessage(bytes(null))).toBeNull();
  });
});

describe("mergeMessages", () => {
  const m = (id: string, at: string, extra: Partial<ChatItem> = {}): ChatItem => ({ id, senderId: "u", senderName: "U", body: id, at, ...extra });
  it("de-duplicates by id (history + live delivery of the same message) and sorts by time", () => {
    const merged = mergeMessages([m("b", "2026-10-20T10:02:00Z"), m("a", "2026-10-20T10:01:00Z")], [m("b", "2026-10-20T10:02:00Z"), m("c", "2026-10-20T10:03:00Z")]);
    expect(merged.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("replaces a pending local copy with the stored row", () => {
    const merged = mergeMessages([m("local-1", "2026-10-20T10:00:00Z", { pending: true })], [m("srv-1", "2026-10-20T10:00:01Z")], "local-1");
    expect(merged.map((x) => x.id)).toEqual(["srv-1"]);
  });
});

describe("grid order and paging", () => {
  const p = (identity: string, extra: Partial<{ isHost: boolean; handRaised: boolean; speaking: boolean }> = {}) => ({ identity, name: identity, isHost: false, handRaised: false, speaking: false, isLocal: false, ...extra });
  it("puts hosts first, then raised hands, then speakers, then names", () => {
    const order = orderForGrid([p("zed"), p("amy", { speaking: true }), p("bob", { handRaised: true }), p("host", { isHost: true })]).map((x) => x.identity);
    expect(order).toEqual(["host", "bob", "amy", "zed"]);
  });
  it("pages 101 people 9 per page", () => {
    expect(pageCount(101, 9)).toBe(12);
    expect(pageCount(0, 9)).toBe(1);
  });
  it("formats the countdown", () => {
    expect(formatClock(65)).toBe("01:05");
    expect(formatClock(3725)).toBe("01:02:05");
    expect(formatClock(-3)).toBe("00:00");
  });
});

describe("handQueue — the host's raise-hand order", () => {
  const h = (identity: string, raisedAt: string | null, handRaised = true) => ({ identity, name: identity, handRaised, raisedAt });
  it("lists only raised hands, first up first, unstamped ones last", () => {
    const order = handQueue([h("late", "2026-10-25T10:05:00Z"), h("none", null), h("down", "2026-10-25T10:00:00Z", false), h("early", "2026-10-25T10:01:00Z")]).map((x) => x.identity);
    expect(order).toEqual(["early", "late", "none"]);
  });
});

describe("featuredIdentity — speaker view", () => {
  const people = [
    { identity: "me", isHost: false, isLocal: true },
    { identity: "host", isHost: true, isLocal: false },
    { identity: "amy", isHost: false, isLocal: false },
  ];
  it("prefers a pin, then a current remote speaker, then the last speaker, then the host", () => {
    expect(featuredIdentity({ people, pinned: "amy", speaking: ["host"], lastSpeaker: null })).toBe("amy");
    expect(featuredIdentity({ people, pinned: null, speaking: ["me", "amy"], lastSpeaker: null })).toBe("amy");
    expect(featuredIdentity({ people, pinned: null, speaking: ["me"], lastSpeaker: "amy" })).toBe("amy");
    expect(featuredIdentity({ people, pinned: null, speaking: [], lastSpeaker: null })).toBe("host");
  });
  it("ignores a pin or last speaker who has left, and falls back to yourself when alone", () => {
    expect(featuredIdentity({ people, pinned: "gone", speaking: [], lastSpeaker: "gone" })).toBe("host");
    expect(featuredIdentity({ people: [people[0]], pinned: null, speaking: [], lastSpeaker: null })).toBe("me");
  });
});

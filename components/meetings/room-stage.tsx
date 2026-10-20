"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RoomAudioRenderer, useConnectionState, useLocalParticipant, useLocalParticipantPermissions, useParticipants, useRoomContext, useTracks } from "@livekit/components-react";
import { ConnectionState, RoomEvent, Track, type RemoteParticipant } from "livekit-client";
import { Signal } from "lucide-react";
import { MeetingSidePanel, type HostAction, type PanelTab } from "@/components/meetings/meeting-side-panel";
import { MeetingToolbar } from "@/components/meetings/meeting-toolbar";
import { allows, handRaised, isHostRole, SOURCE, type Perm } from "@/components/meetings/participant-utils";
import { VideoGrid } from "@/components/meetings/video-grid";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  endMeetingAction,
  listMeetingMessagesAction,
  lowerAllHandsAction,
  moderateParticipantAction,
  muteAllStudentsAction,
  sendMeetingMessageAction,
  sendReactionAction,
  setMyHandAction,
} from "@/lib/actions/meetings";
import { formatClock, mergeMessages, parseRoomMessage, type ChatItem } from "@/lib/meetings/room-logic";

function useSecondsUntil(iso: string): number {
  const [left, setLeft] = useState(() => Math.max(0, Math.round((Date.parse(iso) - Date.now()) / 1000)));
  useEffect(() => {
    const timer = setInterval(() => setLeft(Math.max(0, Math.round((Date.parse(iso) - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [iso]);
  return left;
}

type Notice = { tone: "status" | "alert"; text: string } | null;
type Reaction = { key: string; name: string; emoji: string };

interface RoomStageProps {
  sessionId: string;
  title: string;
  role: "mentor" | "admin" | "student";
  viewerId: string;
  kind: "one_to_one" | "batch";
  endsAt: string;
  hostName: string;
  // Tells the shell the meeting is over for everyone BEFORE this client
  // disconnects, so it shows "ended" rather than "you left".
  onMeetingOver: () => void;
}

// The live room (session_ref.png): video stage + toolbar, Participants/Chat
// panel. Media is host-led: in a batch meeting only the host (and students the
// host allows) publish. Chat, reactions and raised hands go through the server
// (authorized per call) and arrive here as server-sent data.
export function RoomStage({ sessionId, title, role, viewerId, kind, endsAt, hostName, onMeetingOver }: RoomStageProps) {
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
  const isHost = role !== "student";
  const [notice, setNotice] = useState<Notice>(null);
  const [panel, setPanel] = useState<PanelTab | null>("participants");
  const [lastTab, setLastTab] = useState<PanelTab>("participants");
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [chatState, setChatState] = useState<"loading" | "ready" | "error">("loading");
  const [unread, setUnread] = useState(0);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [confirm, setConfirm] = useState<null | { kind: "end" } | { kind: "remove"; identity: string; name: string }>(null);
  const [busy, setBusy] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const secondsLeft = useSecondsUntil(endsAt);
  const over = useRef(false);
  const panelRef = useRef<PanelTab | null>(panel);
  useEffect(() => {
    panelRef.current = panel;
  }, [panel]);

  const canMic = allows(perm, SOURCE.microphone);
  const canCamera = allows(perm, SOURCE.camera);
  const canScreen = allows(perm, SOURCE.screen);
  const handUp = handRaised(localParticipant);
  const sharer = tracks.find((t) => t.source === Track.Source.ScreenShare && t.publication);
  const hostPresent = participants.some(isHostRole);

  // ---- Chat history (on join and after every reconnect) ----
  const loadHistory = useCallback(async () => {
    try {
      const result = await listMeetingMessagesAction(sessionId);
      if (!result.ok || !result.data) throw new Error("load failed");
      setMessages((current) => mergeMessages(current, result.data!));
      setChatState("ready");
    } catch {
      setChatState("error");
    }
  }, [sessionId]);

  useEffect(() => {
    if (connection !== ConnectionState.Connected) return;
    let cancelled = false;
    listMeetingMessagesAction(sessionId)
      .then((result) => {
        if (cancelled) return;
        if (!result.ok || !result.data) throw new Error("load failed");
        setMessages((current) => mergeMessages(current, result.data!));
        setChatState("ready");
      })
      .catch(() => !cancelled && setChatState("error"));
    return () => {
      cancelled = true;
    };
  }, [connection, sessionId]);

  // ---- Server-sent data: chat + reactions; attribute changes: hands ----
  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const onData = (payload: Uint8Array, participant?: RemoteParticipant) => {
      if (participant) return; // only the server publishes data in these rooms
      const message = parseRoomMessage(payload);
      if (!message) return;
      if (message.type === "chat") {
        setMessages((current) => mergeMessages(current, [message]));
        if (panelRef.current !== "chat" && message.senderId !== viewerId) setUnread((n) => n + 1);
      } else {
        const key = `${message.senderId}-${message.at}-${Math.random()}`;
        setReactions((list) => [...list.slice(-5), { key, name: message.senderId === viewerId ? "You" : message.senderName, emoji: message.emoji }]);
        const timer = setTimeout(() => {
          timers.delete(timer);
          setReactions((list) => list.filter((r) => r.key !== key));
        }, 4000);
        timers.add(timer);
      }
    };
    const rerender = () => setTick((n) => n + 1);
    room.on(RoomEvent.DataReceived, onData);
    room.on(RoomEvent.ParticipantAttributesChanged, rerender);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
      room.off(RoomEvent.ParticipantAttributesChanged, rerender);
      for (const t of timers) clearTimeout(t);
    };
  }, [room, viewerId]);

  // Tell a batch student when the host gives or takes the floor.
  const prevCanMic = useRef(canMic);
  useEffect(() => {
    if (role === "student" && kind === "batch" && prevCanMic.current !== canMic) {
      setNotice({ tone: "status", text: canMic ? "The host let you speak. Turn on your microphone when you're ready." : "The host has closed your microphone." });
    }
    prevCanMic.current = canMic;
  }, [canMic, kind, role]);

  // ---- Hard stop at the scheduled end ----
  // Everyone's client leaves; a host's client also ends it on the server. The
  // server refuses new tokens after the end, and its sweep (0025) completes the
  // meeting even if no host is connected.
  useEffect(() => {
    if (secondsLeft > 0 || over.current) return;
    over.current = true;
    onMeetingOver();
    if (isHost) void endMeetingAction(sessionId).finally(() => room.disconnect());
    else void room.disconnect();
  }, [isHost, onMeetingOver, room, secondsLeft, sessionId]);

  function openPanel(tab: PanelTab) {
    setPanel((current) => (current === tab ? null : tab));
    setLastTab(tab);
    if (tab === "chat") setUnread(0);
  }

  async function toggle(what: "mic" | "camera" | "screen") {
    try {
      if (what === "mic") await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
      if (what === "camera") await localParticipant.setCameraEnabled(!isCameraEnabled);
      if (what === "screen") await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    } catch (error) {
      const denied = (error as Error)?.name === "NotAllowedError";
      const device = what === "mic" ? "microphone" : what === "camera" ? "camera" : "screen sharing";
      setNotice({ tone: "alert", text: denied ? `Your browser blocked ${device}. Allow it in the site settings and try again.` : `We couldn't turn on your ${device}.` });
    }
  }

  async function act(run: () => Promise<{ ok: boolean; error?: { message: string } }>, success?: string) {
    try {
      const result = await run();
      setNotice(result.ok ? (success ? { tone: "status", text: success } : null) : { tone: "alert", text: result.error?.message ?? "That didn't work. Try again." });
      return result.ok;
    } catch {
      setNotice({ tone: "alert", text: "We couldn't reach the server. Check your connection and try again." });
      return false;
    }
  }

  async function sendChat(body: string): Promise<boolean> {
    const localId = `local-${Date.now()}`;
    const pendingItem: ChatItem = { id: localId, senderId: viewerId, senderName: "You", body, at: new Date().toISOString(), pending: true };
    setMessages((m) => mergeMessages(m, [pendingItem]));
    try {
      const result = await sendMeetingMessageAction(sessionId, body);
      if (!result.ok || !result.data) throw new Error(result.error?.message ?? "");
      setMessages((m) => mergeMessages(m, [result.data!], localId));
    } catch (error) {
      setMessages((m) => m.map((x) => (x.id === localId ? { ...x, pending: false, failed: true } : x)));
      setNotice({ tone: "alert", text: (error as Error)?.message || "Your message wasn't sent. Tap it in the chat to retry." });
    }
    return true; // the draft lives on in the list (sent, or failed with retry)
  }

  async function retryChat(item: ChatItem) {
    setMessages((m) => m.filter((x) => x.id !== item.id));
    await sendChat(item.body);
  }

  function hostAction(identity: string, name: string, action: HostAction) {
    if (action === "remove") {
      setConfirm({ kind: "remove", identity, name });
      return;
    }
    void act(() => moderateParticipantAction(sessionId, identity, action), `Updated ${name}.`);
  }

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true);
    setEndError(null);
    try {
      if (confirm.kind === "end") {
        const result = await endMeetingAction(sessionId);
        if (!result.ok) {
          // Nothing pretends to have worked: the dialog stays open with the
          // reason and a retry (ending is safe to repeat).
          setEndError(result.error?.message ?? "We couldn't end the meeting. Try again.");
          return;
        }
        over.current = true;
        onMeetingOver();
        setConfirm(null);
        await room.disconnect();
      } else {
        const ok = await act(() => moderateParticipantAction(sessionId, confirm.identity, "remove"), `${confirm.name} was removed and can't rejoin.`);
        if (ok) setConfirm(null);
      }
    } catch {
      setEndError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <RoomAudioRenderer />
      {connection === ConnectionState.Reconnecting && (
        <Alert role="status">
          <AlertDescription>Connection lost. Reconnecting… You&apos;ll be back in the room automatically.</AlertDescription>
        </Alert>
      )}
      {connection === ConnectionState.Connecting && (
        <Alert role="status">
          <AlertDescription>Connecting to the meeting…</AlertDescription>
        </Alert>
      )}
      {!hostPresent && connection === ConnectionState.Connected && (
        <Alert role="status">
          <AlertDescription>{`${hostName} isn't in the room right now. The meeting stays open until its scheduled end.`}</AlertDescription>
        </Alert>
      )}
      {secondsLeft > 0 && secondsLeft <= 300 && (
        <Alert role="status">
          <AlertDescription>
            The meeting ends in {Math.ceil(secondsLeft / 60)} {Math.ceil(secondsLeft / 60) === 1 ? "minute" : "minutes"}, at its scheduled time.
          </AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert variant={notice.tone === "alert" ? "destructive" : "default"} role={notice.tone}>
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label={`${title} — video`} className="flex min-w-0 flex-col rounded-card bg-ink">
          <div className="flex items-center justify-between gap-2 px-3 pt-3 text-[12px] text-white">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-danger px-2 py-0.5 font-semibold">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-white" /> Live
            </span>
            {sharer && (
              <span className="truncate" role="status">
                {sharer.participant.isLocal ? "You are sharing your screen" : `${sharer.participant.name || "Someone"} is sharing their screen`}
              </span>
            )}
            <span className="inline-flex items-center gap-2">
              <span>{formatClock(secondsLeft)} left</span>
              <Signal aria-hidden="true" size={14} className={connection === ConnectionState.Connected ? "text-success" : "text-warning"} />
              <span className="sr-only">{connection === ConnectionState.Connected ? "Connected" : "Reconnecting"}</span>
            </span>
          </div>
          <div className="relative flex min-h-[260px] flex-1 flex-col p-3 sm:min-h-[360px]">
            <VideoGrid tracks={tracks} />
            {reactions.length > 0 && (
              <ul aria-live="polite" aria-label="Reactions" className="pointer-events-none absolute bottom-4 left-4 flex flex-col gap-1">
                {reactions.map((r) => (
                  <li key={r.key} className="inline-flex w-fit items-center gap-1.5 rounded-pill bg-ink/80 px-2.5 py-1 text-[13px] text-white motion-safe:animate-in motion-safe:fade-in">
                    <span className="text-[18px]" aria-hidden="true">
                      {r.emoji}
                    </span>
                    {r.name}
                    <span className="sr-only">reacted {r.emoji}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <MeetingToolbar
            isHost={isHost}
            micOn={isMicrophoneEnabled}
            camOn={isCameraEnabled}
            sharing={isScreenShareEnabled}
            canMic={canMic}
            canCamera={canCamera}
            canScreen={canScreen}
            someoneElseSharing={sharer && !sharer.participant.isLocal ? sharer.participant.name || "Someone" : null}
            handUp={handUp}
            panelOpen={panel}
            participantCount={participants.length}
            unread={unread}
            onMic={() => toggle("mic")}
            onCamera={() => toggle("camera")}
            onShare={() => toggle("screen")}
            onHand={() => void act(() => setMyHandAction(sessionId, !handUp), handUp ? undefined : "Your hand is raised. The host can see it.")}
            onPanel={openPanel}
            onReact={(emoji) => void act(() => sendReactionAction(sessionId, emoji))}
            onMuteAll={() => void act(() => muteAllStudentsAction(sessionId), "Muted every student's microphone.")}
            onLowerAll={() => void act(() => lowerAllHandsAction(sessionId), "Lowered all hands.")}
            onLeave={() => room.disconnect()}
            onEnd={() => {
              setEndError(null);
              setConfirm({ kind: "end" });
            }}
          />
        </section>
        <div className={panel ? "block" : "hidden"}>
          <MeetingSidePanel
            tab={panel ?? lastTab}
            onTab={(t) => {
              setPanel(t);
              setLastTab(t);
              if (t === "chat") setUnread(0);
            }}
            participants={participants}
            kind={kind}
            canModerate={isHost}
            onHostAction={hostAction}
            messages={messages}
            chatState={chatState}
            onReloadChat={loadHistory}
            onSend={sendChat}
            onRetry={retryChat}
            viewerId={viewerId}
            unread={unread}
          />
        </div>
      </div>

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && !busy && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm?.kind === "end" ? "End the meeting for everyone?" : `Remove ${confirm?.kind === "remove" ? confirm.name : ""}?`}</DialogTitle>
            <DialogDescription>
              {confirm?.kind === "end"
                ? "Everyone is disconnected, no one can join again, and attendance is finalized (present = 75% of the scheduled time). To step out without ending it, choose Leave without ending."
                : "They're disconnected and can't rejoin this meeting."}
            </DialogDescription>
          </DialogHeader>
          {endError && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{endError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setConfirm(null)} disabled={busy}>
              Cancel
            </Button>
            <div className="flex flex-wrap gap-2">
              {confirm?.kind === "end" && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => {
                    setConfirm(null);
                    void room.disconnect();
                  }}
                >
                  Leave without ending
                </Button>
              )}
              <Button type="button" variant="destructive" className="min-h-11" onClick={runConfirm} disabled={busy}>
                {busy ? "Working…" : confirm?.kind === "end" ? (endError ? "Try again" : "End for everyone") : "Remove"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

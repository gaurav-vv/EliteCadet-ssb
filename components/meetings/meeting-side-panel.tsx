"use client";

import { useEffect, useRef, useState } from "react";
import { useConnectionQualityIndicator, useIsSpeaking } from "@livekit/components-react";
import { ConnectionQuality, type Participant } from "livekit-client";
import { Hand, Mic, MicOff, MoreHorizontal, RotateCw, Search, SendHorizontal, Smile, Video, VideoOff, WifiOff } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { allows, handRaised, handRaisedAt, initials, isHostRole, roleOf, SOURCE, type Perm } from "@/components/meetings/participant-utils";
import { handQueue, orderForGrid, type ChatItem } from "@/lib/meetings/room-logic";

export type PanelTab = "participants" | "chat";
export type HostAction = "allow_audio" | "allow_video" | "revoke" | "mute" | "remove" | "lower_hand";

const TIME = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true });
const CHAT_EMOJI = ["👍", "👏", "🙏", "😊", "✅", "❓"];

function PersonRow({ p, kind, canModerate, onAction }: { p: Participant; kind: "one_to_one" | "batch"; canModerate: boolean; onAction: (identity: string, name: string, action: HostAction) => void }) {
  const speaking = useIsSpeaking(p);
  const { quality } = useConnectionQualityIndicator({ participant: p });
  const name = p.name || "Participant";
  const host = isHostRole(p);
  const hand = handRaised(p);
  const perm = p.permissions as Perm;
  const canSpeak = allows(perm, SOURCE.microphone);
  const canVideo = allows(perm, SOURCE.camera);
  const weak = quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost;
  const roleLabel = host ? (roleOf(p) === "admin" ? "Co-host (academy)" : "Host") : kind === "batch" ? (canVideo ? "Can speak and share video" : canSpeak ? "Can speak" : "Listening") : "Student";
  return (
    <li className="flex min-h-12 items-center gap-3 px-4 py-2">
      <span aria-hidden="true" className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold", host ? "bg-brand-accent text-white" : "bg-surface-base text-ink")}>
        {initials(name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink">
          {name}
          {p.isLocal ? " (you)" : ""}
        </span>
        <span className="block text-[12px] text-ink-secondary">
          {roleLabel}
          {speaking ? " · Speaking" : ""}
          {weak ? (quality === ConnectionQuality.Lost ? " · Reconnecting" : " · Weak connection") : ""}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5 text-ink-secondary">
        {hand && (
          <span role="img" aria-label="Hand raised" className="inline-flex size-8 items-center justify-center text-warning">
            <Hand aria-hidden="true" size={16} />
          </span>
        )}
        {weak && (
          <span role="img" aria-label="Weak connection" className="inline-flex size-8 items-center justify-center">
            <WifiOff aria-hidden="true" size={16} />
          </span>
        )}
        <span role="img" aria-label={p.isMicrophoneEnabled ? "Microphone on" : "Muted"} className="inline-flex size-8 items-center justify-center">
          {p.isMicrophoneEnabled ? <Mic aria-hidden="true" size={16} className={speaking ? "text-success" : undefined} /> : <MicOff aria-hidden="true" size={16} className="text-danger" />}
        </span>
        <span role="img" aria-label={p.isCameraEnabled ? "Camera on" : "Camera off"} className="inline-flex size-8 items-center justify-center">
          {p.isCameraEnabled ? <Video aria-hidden="true" size={16} /> : <VideoOff aria-hidden="true" size={16} />}
        </span>
        {canModerate && !host && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Actions for ${name}`}>
                <MoreHorizontal aria-hidden="true" size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {hand && <DropdownMenuItem onSelect={() => onAction(p.identity, name, "lower_hand")}>Lower hand</DropdownMenuItem>}
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

interface SidePanelProps {
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  participants: Participant[];
  kind: "one_to_one" | "batch";
  canModerate: boolean;
  onHostAction: (identity: string, name: string, action: HostAction) => void;
  messages: ChatItem[];
  chatState: "loading" | "ready" | "error";
  onReloadChat: () => void;
  onSend: (body: string) => Promise<boolean>;
  onRetry: (item: ChatItem) => void;
  viewerId: string;
  unread: number;
}

// session_ref.png right: Participants / Chat tabs.
export function MeetingSidePanel({ tab, onTab, participants, kind, canModerate, onHostAction, messages, chatState, onReloadChat, onSend, onRetry, viewerId, unread }: SidePanelProps) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (tab === "chat" && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages.length, tab]);

  const people = orderForGrid(
    participants.map((p) => ({ p, identity: p.identity, name: p.name || "Participant", isHost: isHostRole(p), handRaised: handRaised(p), speaking: p.isSpeaking, isLocal: p.isLocal })),
  )
    .filter((x) => !query.trim() || x.name.toLowerCase().includes(query.trim().toLowerCase()))
    .map((x) => x.p);
  const queue = handQueue(participants.map((p) => ({ p, identity: p.identity, name: p.name || "Participant", handRaised: handRaised(p), raisedAt: handRaisedAt(p) })));
  const hands = queue.length;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const ok = await onSend(body);
    setSending(false);
    if (ok) setDraft("");
  }

  const tabClass = (active: boolean) =>
    cn("min-h-11 flex-1 border-b-2 px-3 text-[14px] font-medium transition-colors", active ? "border-brand-accent text-brand-accent" : "border-transparent text-ink-secondary hover:text-ink");

  return (
    <section aria-label="Participants and chat" className="glass-regular flex min-h-[420px] flex-col overflow-hidden rounded-card lg:h-full">
      <div role="tablist" aria-label="Side panel" className="flex border-b border-hairline">
        <button type="button" role="tab" id="tab-participants" aria-selected={tab === "participants"} aria-controls="panel-participants" className={tabClass(tab === "participants")} onClick={() => onTab("participants")}>
          Participants ({participants.length})
        </button>
        <button type="button" role="tab" id="tab-chat" aria-selected={tab === "chat"} aria-controls="panel-chat" className={tabClass(tab === "chat")} onClick={() => onTab("chat")}>
          Chat
          {unread > 0 && tab !== "chat" && <span className="ml-1.5 rounded-pill bg-danger px-1.5 text-[11px] text-white">{unread}</span>}
        </button>
      </div>

      {tab === "participants" ? (
        <div role="tabpanel" id="panel-participants" aria-labelledby="tab-participants" className="flex min-h-0 flex-1 flex-col">
          <label className="relative mx-4 mt-3 mb-1 block">
            <span className="sr-only">Search participants</span>
            <Search aria-hidden="true" size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-secondary" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search participants…" className="glass-thin h-10 w-full rounded-pill pr-3 pl-8 text-[14px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-accent" />
          </label>
          {hands > 0 && !canModerate && <p className="px-4 pt-1 text-[12px] font-medium text-ink">{hands === 1 ? "1 hand raised" : `${hands} hands raised`}</p>}
          {hands > 0 && canModerate && (
            <section aria-labelledby="hand-queue-heading" className="mx-4 mt-2 rounded-card border border-hairline">
              <h3 id="hand-queue-heading" className="flex items-center gap-1.5 px-3 pt-2.5 text-[12px] font-semibold text-ink">
                <Hand aria-hidden="true" size={14} className="text-warning" />
                {hands === 1 ? "1 hand raised" : `${hands} hands raised`}
                <span className="font-normal text-ink-secondary">· first up first</span>
              </h3>
              <ol className="divide-y divide-hairline">
                {queue.map(({ p, name }, i) => {
                  const canSpeak = allows(p.permissions as Perm, SOURCE.microphone);
                  return (
                    <li key={p.identity} className="flex flex-wrap items-center gap-2 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                        <span className="text-ink-secondary">{i + 1}.</span> {name}
                      </span>
                      {kind === "batch" && !canSpeak && (
                        <Button type="button" variant="outline" size="sm" className="min-h-9" onClick={() => onHostAction(p.identity, name, "allow_audio")}>
                          Let speak
                        </Button>
                      )}
                      <Button type="button" variant="ghost" size="sm" className="min-h-9" onClick={() => onHostAction(p.identity, name, "lower_hand")} aria-label={`Lower ${name}'s hand`}>
                        Lower
                      </Button>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
          <ul className="flex-1 divide-y divide-hairline overflow-y-auto pb-2">
            {people.length === 0 ? <li className="px-4 py-6 text-center text-[13px] text-ink-secondary">No one matches “{query}”.</li> : people.map((p) => <PersonRow key={p.identity} p={p} kind={kind} canModerate={canModerate} onAction={onHostAction} />)}
          </ul>
        </div>
      ) : (
        <div role="tabpanel" id="panel-chat" aria-labelledby="tab-chat" className="flex min-h-0 flex-1 flex-col">
          {chatState === "loading" ? (
            <p role="status" className="flex-1 px-4 py-6 text-center text-[13px] text-ink-secondary">Loading chat…</p>
          ) : chatState === "error" && messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
              <p className="text-[13px] text-ink">We couldn&apos;t load the chat.</p>
              <Button type="button" variant="outline" className="min-h-11" onClick={onReloadChat}>
                <RotateCw aria-hidden="true" size={14} /> Try again
              </Button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 px-4 py-6 text-center">
              <p className="text-[14px] font-semibold text-ink">No messages yet</p>
              <p className="text-[13px] text-ink-secondary">Say hello — everyone in this meeting can read the chat.</p>
            </div>
          ) : (
            <ol ref={logRef} role="log" aria-live="polite" aria-label="Chat messages" className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.map((m) => (
                <li key={m.id} className="flex gap-2.5">
                  <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-base text-[12px] font-semibold text-ink">
                    {initials(m.senderName)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px]">
                      <span className={cn("font-semibold", m.senderId === viewerId ? "text-brand-accent" : "text-ink")}>{m.senderId === viewerId ? "You" : m.senderName}</span>{" "}
                      <time dateTime={m.at} className="text-ink-secondary">
                        {TIME.format(new Date(m.at))}
                      </time>
                    </p>
                    <p className="text-[14px] break-words whitespace-pre-wrap text-ink">{m.body}</p>
                    {m.pending && <p className="text-[12px] text-ink-secondary">Sending…</p>}
                    {m.failed && (
                      <button type="button" onClick={() => onRetry(m)} className="inline-flex min-h-8 items-center gap-1 text-[12px] text-danger underline">
                        Not sent — tap to retry
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
          <form onSubmit={submit} className="flex items-center gap-2 border-t border-hairline p-3">
            <label className="sr-only" htmlFor="chat-input">
              Message everyone
            </label>
            <div className="relative flex-1">
              <input
                id="chat-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={1000}
                placeholder="Type a message…"
                autoComplete="off"
                className="glass-thin h-11 w-full rounded-control pr-10 pl-3 text-[14px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" aria-label="Insert emoji" className="absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-secondary hover:text-ink">
                    <Smile aria-hidden="true" size={18} />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-2">
                  <div className="flex gap-1">
                    {CHAT_EMOJI.map((e) => (
                      <button key={e} type="button" className="inline-flex size-9 items-center justify-center rounded-control text-[20px] hover:bg-surface-base" onClick={() => setDraft((d) => `${d}${e}`)} aria-label={`Insert ${e}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <Button type="submit" size="icon" className="size-11 shrink-0" disabled={!draft.trim() || sending} aria-label="Send message">
              <SendHorizontal aria-hidden="true" size={18} />
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}

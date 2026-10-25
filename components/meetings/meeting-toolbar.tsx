"use client";

import { type ReactNode } from "react";
import { Hand, Heart, MessageSquare, Mic, MicOff, MonitorUp, MoreHorizontal, PhoneOff, Users, Video, VideoOff } from "lucide-react";
import { cn } from "cn";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const REACTION_EMOJI = ["👍", "👏", "❤️", "😂", "😮", "🎉", "✅", "❌", "❓", "🙏", "💡", "☕"] as const;

interface ToolButtonProps {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  pressed?: boolean;
  disabled?: boolean;
  // Why it's disabled — shown as the tooltip and read by screen readers.
  disabledReason?: string;
  badge?: number;
  active?: boolean;
  asTrigger?: boolean;
}

function ToolButton({ label, icon, onClick, pressed, disabled, disabledReason, badge, active, ...rest }: ToolButtonProps & Record<string, unknown>) {
  const describedBy = disabled && disabledReason ? `${label.replace(/\W+/g, "-").toLowerCase()}-why` : undefined;
  const button = (
    <button
      type="button"
      {...rest}
      onClick={disabled ? undefined : onClick}
      aria-pressed={pressed}
      aria-disabled={disabled || undefined}
      aria-describedby={describedBy}
      title={disabled ? disabledReason : label}
      className={cn(
        "relative flex min-h-14 min-w-16 flex-col items-center justify-center gap-1 rounded-control px-2 text-[12px] text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:outline-none",
        disabled ? "cursor-not-allowed opacity-40" : "hover:bg-ink-secondary/40",
        active && "text-success",
      )}
    >
      <span aria-hidden="true" className="relative">
        {icon}
        {badge !== undefined && badge > 0 && <span className="absolute -top-1.5 -right-2.5 rounded-pill bg-danger px-1 text-[10px] leading-4 text-white">{badge > 99 ? "99+" : badge}</span>}
      </span>
      {label}
    </button>
  );
  // The reason is a description (aria-describedby), kept outside the button so
  // its accessible name stays just the label. Never used on popover triggers.
  return describedBy ? (
    <>
      {button}
      <span id={describedBy} className="sr-only">
        {disabledReason}
      </span>
    </>
  ) : (
    button
  );
}

interface MeetingToolbarProps {
  isHost: boolean;
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  canMic: boolean;
  canCamera: boolean;
  canScreen: boolean;
  someoneElseSharing: string | null;
  handUp: boolean;
  panelOpen: "participants" | "chat" | null;
  participantCount: number;
  unread: number;
  onMic: () => void;
  onCamera: () => void;
  onShare: () => void;
  onHand: () => void;
  onPanel: (tab: "participants" | "chat") => void;
  onReact: (emoji: string) => void;
  onMuteAll: () => void;
  onLowerAll: () => void;
  onLeave: () => void;
  onEnd: () => void;
  layout: "gallery" | "speaker";
  onLayout: () => void;
  fullscreen: boolean;
  canFullscreen: boolean;
  onFullscreen: () => void;
  onDevices: () => void;
}

// session_ref.png bottom bar. Every control works; ones a person isn't allowed
// to use are disabled with the reason, never decorative.
export function MeetingToolbar(props: MeetingToolbarProps) {
  const { isHost, micOn, camOn, sharing, canMic, canCamera, canScreen, someoneElseSharing, handUp, panelOpen, participantCount, unread } = props;
  return (
    <div role="toolbar" aria-label="Meeting controls" className="flex flex-wrap items-center justify-center gap-1 rounded-b-card bg-ink px-2 py-2 sm:justify-between">
      <div className="flex flex-wrap items-center justify-center gap-1">
        <ToolButton
          label={micOn ? "Mute" : "Unmute"}
          icon={micOn ? <Mic size={20} /> : <MicOff size={20} />}
          pressed={!micOn}
          onClick={props.onMic}
          disabled={!canMic}
          disabledReason="You're listening. The host can let you speak — raise your hand to ask."
        />
        <ToolButton
          label={camOn ? "Stop video" : "Start video"}
          icon={camOn ? <Video size={20} /> : <VideoOff size={20} />}
          pressed={camOn}
          onClick={props.onCamera}
          disabled={!canCamera}
          disabledReason="The host hasn't allowed your camera in this batch meeting."
        />
        <ToolButton
          label={sharing ? "Stop sharing" : "Share screen"}
          icon={<MonitorUp size={20} />}
          pressed={sharing}
          active={sharing}
          onClick={props.onShare}
          disabled={!canScreen || (Boolean(someoneElseSharing) && !sharing)}
          disabledReason={!canScreen ? "Only the host can share their screen." : `${someoneElseSharing} is sharing. Only one screen at a time.`}
        />
        {!isHost && <ToolButton label={handUp ? "Lower hand" : "Raise hand"} icon={<Hand size={20} />} pressed={handUp} active={handUp} onClick={props.onHand} />}
        <ToolButton label="Chat" icon={<MessageSquare size={20} />} pressed={panelOpen === "chat"} onClick={() => props.onPanel("chat")} badge={panelOpen === "chat" ? 0 : unread} />
        <ToolButton label={`Participants (${participantCount})`} icon={<Users size={20} />} pressed={panelOpen === "participants"} onClick={() => props.onPanel("participants")} />
        <Popover>
          <PopoverTrigger asChild>
            <ToolButton label="Reactions" icon={<Heart size={20} />} />
          </PopoverTrigger>
          <PopoverContent side="top" className="w-auto p-2">
            <p className="px-1 pb-1 text-[12px] text-ink-secondary">Send a reaction to everyone</p>
            <div className="grid grid-cols-6 gap-1">
              {REACTION_EMOJI.map((e) => (
                <button key={e} type="button" onClick={() => props.onReact(e)} className="inline-flex size-10 items-center justify-center rounded-control text-[22px] hover:bg-surface-base focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:outline-none" aria-label={`React ${e}`}>
                  {e}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ToolButton label="More" icon={<MoreHorizontal size={20} />} />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="center">
            {isHost && (
              <>
                <DropdownMenuItem onSelect={props.onMuteAll}>Mute all students</DropdownMenuItem>
                <DropdownMenuItem onSelect={props.onLowerAll}>Lower all hands</DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onSelect={props.onDevices}>Audio and video settings</DropdownMenuItem>
            <DropdownMenuItem onSelect={props.onLayout}>{props.layout === "gallery" ? "Switch to speaker view" : "Switch to gallery view"}</DropdownMenuItem>
            {props.canFullscreen && <DropdownMenuItem onSelect={props.onFullscreen}>{props.fullscreen ? "Exit full screen" : "Full screen"}</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={props.onLeave}>Leave meeting</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[12px] font-normal text-ink-secondary">Whiteboard, polls and breakout rooms aren&apos;t available yet.</DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={props.onLeave}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-button px-3 text-[13px] font-medium text-white hover:bg-ink-secondary/40 focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:outline-none"
        >
          <PhoneOff aria-hidden="true" size={16} /> Leave
        </button>
        {isHost && (
          <button
            type="button"
            onClick={props.onEnd}
            className="inline-flex min-h-11 items-center rounded-button bg-danger px-4 text-[13px] font-semibold text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            End meeting
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { resendMentorInviteAction, revokeMentorInviteAction } from "@/lib/actions/academy-people";

interface MentorInviteActionsProps {
  mentorId: string;
  name: string;
  access: "not_invited" | "invited" | "expired";
}

// Row actions for a mentor who hasn't activated their account. The server
// re-checks the academy and the mentor's state on every call.
export function MentorInviteActions({ mentorId, name, access }: MentorInviteActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "status" | "alert"; text: string } | null>(null);

  async function send() {
    setPending(true);
    setMessage(null);
    try {
      const result = await resendMentorInviteAction(mentorId);
      setMessage(result.ok ? { tone: "status", text: `Invite sent to ${name}. The link expires in 1 hour.` } : { tone: "alert", text: result.error?.message ?? "We couldn't send the invite. Please try again." });
      if (result.ok) router.refresh();
    } catch {
      setMessage({ tone: "alert", text: "We couldn't reach the server. Check your connection and try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" className="min-h-11" onClick={send} disabled={pending} aria-label={`${access === "not_invited" ? "Send invite to" : "Resend invite to"} ${name}`}>
          {pending ? "Sending…" : access === "not_invited" ? "Send invite" : "Resend invite"}
        </Button>
        <ConfirmActionDialog
          triggerLabel={access === "not_invited" ? "Remove" : "Revoke"}
          triggerAriaLabel={`${access === "not_invited" ? "Remove" : "Revoke the invite for"} ${name}`}
          title={access === "not_invited" ? `Remove ${name}?` : `Revoke ${name}'s invite?`}
          description={
            access === "not_invited"
              ? "They were added manually and never invited, so their profile is removed from your academy (and from any batches). You can add them again later."
              : "Their invite link stops working right away and their profile is removed from your academy (and from any batches), because they never activated it. You can invite them again later."
          }
          confirmLabel={access === "not_invited" ? "Remove mentor" : "Revoke invite"}
          destructive
          action={revokeMentorInviteAction.bind(null, mentorId)}
        />
      </div>
      {message && (
        <p role={message.tone} className={message.tone === "alert" ? "max-w-xs text-right text-[12px] text-danger" : "max-w-xs text-right text-[12px] text-ink-secondary"}>
          {message.text}
        </p>
      )}
    </div>
  );
}

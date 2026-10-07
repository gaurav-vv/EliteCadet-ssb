"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteAcademyMentorAction } from "@/lib/actions/academy-people";

// A real invite: the mentor gets an email to set their password, and joins
// this academy as a mentor (supabase/migrations/0007 signup trigger).
export function InviteMentorForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setOutcome(null);
    try {
      const result = await inviteAcademyMentorAction({ fullName, email });
      if (!result.ok) {
        setOutcome({ tone: "error", message: result.error?.message ?? "Something went wrong. Please try again." });
        return;
      }
      setOutcome({ tone: "success", message: `Invite sent to ${result.data?.name ?? email}.` });
      setFullName("");
      setEmail("");
      router.refresh();
    } catch {
      setOutcome({ tone: "error", message: "We couldn't reach the server. Check your connection and try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="glass-regular flex flex-col gap-4 rounded-card px-6 py-6">
      <h2 className="text-[18px] font-semibold text-ink">Invite a mentor</h2>
      {outcome && (
        <Alert variant={outcome.tone === "error" ? "destructive" : "default"} role={outcome.tone === "error" ? "alert" : "status"}>
          <AlertDescription>{outcome.message}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mentorName">Full name</Label>
          <Input id="mentorName" className="h-11" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={pending} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mentorEmail">Email</Label>
          <Input id="mentorEmail" type="email" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} disabled={pending} />
        </div>
        <Button type="submit" className="h-11" disabled={pending || !email.trim() || !fullName.trim()}>
          {pending ? "Inviting…" : "Send invite"}
        </Button>
      </form>
    </div>
  );
}

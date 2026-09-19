"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { inviteMentorAction } from "@/lib/actions/academy";

export function InviteMentorForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);

    const result = await inviteMentorAction({ fullName, email });

    if (!result.ok) {
      setStatus("error");
      setErrorMessage(result.error?.message ?? "Something went wrong. Please try again.");
      return;
    }

    setFullName("");
    setEmail("");
    setStatus("idle");
    router.refresh();
  }

  return (
    <div className="glass-regular flex flex-col gap-4 px-6 py-6">
      <h2 className="text-sm font-medium text-ink-secondary">Invite a mentor</h2>
      {status === "error" && errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mentorName">Full name</Label>
          <Input id="mentorName" required value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={status === "loading"} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mentorEmail">Email</Label>
          <Input id="mentorEmail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={status === "loading"} />
        </div>
        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Inviting…" : "Send invite"}
        </Button>
      </form>
    </div>
  );
}

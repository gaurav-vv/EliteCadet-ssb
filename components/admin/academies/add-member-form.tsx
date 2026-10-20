"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addAcademyMemberAction } from "@/lib/actions/academies";
import type { MemberRole } from "@/types/academies";

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "mentor", label: "Mentor" },
  { value: "academy_admin", label: "Academy Admin" },
];

export function AddMemberForm({ academyId }: { academyId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("student");
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setOutcome(null);
    try {
      const result = await addAcademyMemberAction(academyId, email, role);
      if (!result.ok) {
        setOutcome({ tone: "error", message: result.error?.message ?? "That didn't work. Please try again." });
        return;
      }
      setOutcome({ tone: "success", message: `${result.data?.name ?? "They"} added as ${ROLE_OPTIONS.find((r) => r.value === role)?.label}.` });
      setEmail("");
      router.refresh();
    } catch {
      setOutcome({ tone: "error", message: "We couldn't reach the server. Check your connection and try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      {outcome && (
        <Alert variant={outcome.tone === "error" ? "destructive" : "default"} role={outcome.tone === "error" ? "alert" : "status"}>
          <AlertDescription>{outcome.message}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="member-email">Account email</Label>
          <Input id="member-email" type="email" autoComplete="off" className="min-h-11" value={email} onChange={(e) => setEmail(e.target.value)} disabled={pending} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="member-role">Role in this academy</Label>
          <Select value={role} onValueChange={(v) => setRole(v as MemberRole)} disabled={pending}>
            <SelectTrigger id="member-role" className="min-h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="min-h-11" disabled={pending || !email.trim()}>
          {pending ? "Adding…" : "Add member"}
        </Button>
      </div>
      <p className="text-[12px] text-ink-secondary">The person needs an account already. Adding someone from another academy moves them here.</p>
    </form>
  );
}

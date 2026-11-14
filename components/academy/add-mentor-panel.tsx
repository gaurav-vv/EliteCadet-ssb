"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { InviteMentorForm } from "@/components/academy/invite-mentor-form";
import { addMentorManuallyAction } from "@/lib/actions/academy-people";

type ManualField = "fullName" | "email" | "phone" | "qualifications" | "specialization";
const EMPTY: Record<ManualField, string> = { fullName: "", email: "", phone: "", qualifications: "", specialization: "" };

// Profile only: no email is sent and no login is created. The mentor gets
// login access only by accepting an invite (sent later from the list) and
// choosing their own password.
function ManualMentorForm() {
  const router = useRouter();
  const [values, setValues] = useState(EMPTY);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<{ tone: "success" | "error"; message: string; field?: string } | null>(null);
  const set = (field: ManualField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [field]: e.target.value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setOutcome(null);
    try {
      const result = await addMentorManuallyAction(values);
      if (!result.ok) {
        setOutcome({ tone: "error", message: result.error?.message ?? "Something went wrong. Please try again.", field: result.field });
        return;
      }
      setOutcome({
        tone: "success",
        message: `${result.data?.name ?? "The mentor"} was added. They can't log in yet: when you're ready, use “Send invite” next to their name below so they can set their own password.`,
      });
      setValues(EMPTY);
      router.refresh();
    } catch {
      setOutcome({ tone: "error", message: "We couldn't reach the server. Check your connection and try again." });
    } finally {
      setPending(false);
    }
  }

  const invalid = (field: ManualField) => (outcome?.tone === "error" && outcome.field === field ? { "aria-invalid": true, "aria-describedby": "manual-mentor-error" } : {});

  return (
    <div className="flex flex-col gap-4">
      {outcome && (
        <Alert variant={outcome.tone === "error" ? "destructive" : "default"} role={outcome.tone === "error" ? "alert" : "status"} id={outcome.tone === "error" ? "manual-mentor-error" : undefined}>
          <AlertDescription>{outcome.message}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manualName">Full name</Label>
          <Input id="manualName" className="h-11" autoComplete="off" value={values.fullName} onChange={set("fullName")} disabled={pending} {...invalid("fullName")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manualEmail">Email</Label>
          <Input id="manualEmail" type="email" className="h-11" autoComplete="off" value={values.email} onChange={set("email")} disabled={pending} {...invalid("email")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manualPhone">
            Phone <span className="font-normal text-ink-secondary">(optional)</span>
          </Label>
          <Input id="manualPhone" type="tel" className="h-11" autoComplete="off" value={values.phone} onChange={set("phone")} disabled={pending} {...invalid("phone")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manualSpecialization">
            Specialization <span className="font-normal text-ink-secondary">(optional, comma-separated)</span>
          </Label>
          <Input id="manualSpecialization" className="h-11" placeholder="e.g. Interview, GTO, Psychology" value={values.specialization} onChange={set("specialization")} disabled={pending} {...invalid("specialization")} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="manualQualifications">
            Qualifications <span className="font-normal text-ink-secondary">(optional)</span>
          </Label>
          <Textarea id="manualQualifications" rows={3} maxLength={500} value={values.qualifications} onChange={set("qualifications")} disabled={pending} {...invalid("qualifications")} />
        </div>
        <p className="text-[13px] text-ink-secondary sm:col-span-2">
          This creates the mentor&apos;s profile in your academy so you can put them on batches. It doesn&apos;t send an email and doesn&apos;t give them a login. They can log in only after they accept an invite and choose their own password.
        </p>
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" className="h-11" disabled={pending || !values.email.trim() || !values.fullName.trim()}>
            {pending ? "Adding…" : "Add mentor"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Academy → Mentors: the two ways to add a mentor.
export function AddMentorPanel() {
  return (
    <section aria-labelledby="add-mentor-heading" className="glass-regular flex flex-col gap-4 rounded-card px-6 py-6">
      <div>
        <h2 id="add-mentor-heading" className="text-[18px] font-semibold text-ink">
          Add a mentor
        </h2>
        <p className="mt-1 text-[14px] text-ink-secondary">Invite them by email to set up their login now, or add their profile first and invite them later.</p>
      </div>
      <Tabs defaultValue="invite" className="flex flex-col gap-4">
        <TabsList aria-label="How to add the mentor">
          <TabsTrigger value="invite" className="min-h-11 px-4">
            Invite by email
          </TabsTrigger>
          <TabsTrigger value="manual" className="min-h-11 px-4">
            Add manually
          </TabsTrigger>
        </TabsList>
        <TabsContent value="invite" className="flex flex-col gap-3">
          <p className="text-[13px] text-ink-secondary">They get an email with a link to choose their password. The link works once and expires after 1 hour; you can resend it.</p>
          <InviteMentorForm embedded />
        </TabsContent>
        <TabsContent value="manual">
          <ManualMentorForm />
        </TabsContent>
      </Tabs>
    </section>
  );
}

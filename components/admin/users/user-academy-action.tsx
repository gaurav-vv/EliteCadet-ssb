"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeUserAcademyAction } from "@/lib/actions/academies";
import type { AcademyOption } from "@/types/academies";

const NONE = "none";

interface UserAcademyActionProps {
  userId: string;
  name: string;
  currentAcademyId: string | null;
  options: AcademyOption[];
}

// Move a user to another academy (or out of one). The rules — mentors and
// academy admins must keep an academy — are enforced on the server.
export function UserAcademyAction({ userId, name, currentAcademyId, options }: UserAcademyActionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentAcademyId ?? NONE);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const result = await changeUserAcademyAction(userId, value === NONE ? "" : value);
      if (!result.ok) {
        setError(result.error?.message ?? "That didn't work. Please try again.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (next) {
          setValue(currentAcademyId ?? NONE);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="min-h-11">
          Change academy
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-panel sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Change academy</DialogTitle>
          <DialogDescription>Choose which academy {name} belongs to. They&apos;ll only see that academy&apos;s data.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="user-academy">Academy</Label>
          <Select value={value} onValueChange={setValue} disabled={pending}>
            <SelectTrigger id="user-academy" className="min-h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No academy</SelectItem>
              {options.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" className="min-h-11" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" className="min-h-11" onClick={confirm} disabled={pending || value === (currentAcademyId ?? NONE)}>
            {pending ? "Saving…" : "Change academy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

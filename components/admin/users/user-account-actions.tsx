"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeUserRoleAction, changeUserStatusAction } from "@/lib/actions/users";
import { ROLE_LABELS, type Role, type UserStatus } from "@/types/auth";

const ROLES: Role[] = ["student", "mentor", "academy_admin", "super_admin"];

interface UserAccountActionsProps {
  userId: string;
  name: string;
  role: Role;
  status: UserStatus;
}

type Outcome = { tone: "success" | "error"; message: string } | null;

const NETWORK_ERROR = "We couldn't reach the server. Check your connection and try again.";

// Role change + suspend/reactivate, each behind a confirmation dialog. All
// rules (no self-change, academy required for mentor/academy admin) are
// enforced on the server; this only collects intent and shows the outcome.
export function UserAccountActions({ userId, name, role, status }: UserAccountActionsProps) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<Outcome>(null);

  const [roleOpen, setRoleOpen] = useState(false);
  const [newRole, setNewRole] = useState<Role>(role);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [rolePending, setRolePending] = useState(false);

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusPending, setStatusPending] = useState(false);

  const suspending = status === "active";

  async function confirmRole() {
    setRolePending(true);
    setRoleError(null);
    try {
      const result = await changeUserRoleAction(userId, newRole);
      if (!result.ok) {
        setRoleError(result.error?.message ?? "That didn't work. Please try again.");
        return;
      }
      setRoleOpen(false);
      setOutcome({ tone: "success", message: `${name} is now ${ROLE_LABELS[newRole]}.` });
      router.refresh();
    } catch {
      setRoleError(NETWORK_ERROR);
    } finally {
      setRolePending(false);
    }
  }

  async function confirmStatus() {
    setStatusPending(true);
    setStatusError(null);
    try {
      const result = await changeUserStatusAction(userId, suspending ? "suspended" : "active");
      if (!result.ok) {
        setStatusError(result.error?.message ?? "That didn't work. Please try again.");
        return;
      }
      setStatusOpen(false);
      setOutcome({ tone: "success", message: suspending ? `${name}'s account is suspended.` : `${name}'s account is active again.` });
      router.refresh();
    } catch {
      setStatusError(NETWORK_ERROR);
    } finally {
      setStatusPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {outcome && (
        <Alert variant={outcome.tone === "error" ? "destructive" : "default"} role="status">
          <AlertDescription>{outcome.message}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap gap-3">
        <Dialog
          open={roleOpen}
          onOpenChange={(open) => {
            if (rolePending) return;
            setRoleOpen(open);
            if (open) {
              setNewRole(role);
              setRoleError(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button type="button" variant="outline" className="min-h-11">
              Change role
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-thick rounded-panel sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Change role</DialogTitle>
              <DialogDescription>
                A role decides which workspace {name} can open. They&apos;ll see the new workspace on their next page load.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newRole">New role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)} disabled={rolePending}>
                <SelectTrigger id="newRole" className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {roleError && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{roleError}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" className="min-h-11" onClick={() => setRoleOpen(false)} disabled={rolePending}>
                Cancel
              </Button>
              <Button type="button" className="min-h-11" onClick={confirmRole} disabled={rolePending || newRole === role}>
                {rolePending ? "Saving…" : "Change role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={statusOpen}
          onOpenChange={(open) => {
            if (statusPending) return;
            setStatusOpen(open);
            if (open) setStatusError(null);
          }}
        >
          <DialogTrigger asChild>
            <Button type="button" variant={suspending ? "destructive" : "outline"} className="min-h-11">
              {suspending ? "Suspend account" : "Reactivate account"}
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-thick rounded-panel sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{suspending ? "Suspend this account?" : "Reactivate this account?"}</DialogTitle>
              <DialogDescription>
                {suspending
                  ? `${name} will be signed out on their next request and won't be able to log in until reactivated. Their data is kept.`
                  : `${name} will be able to log in again with their existing details.`}
              </DialogDescription>
            </DialogHeader>
            {statusError && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{statusError}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" className="min-h-11" onClick={() => setStatusOpen(false)} disabled={statusPending}>
                Cancel
              </Button>
              <Button type="button" variant={suspending ? "destructive" : "default"} className="min-h-11" onClick={confirmStatus} disabled={statusPending}>
                {statusPending ? "Saving…" : suspending ? "Suspend account" : "Reactivate account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

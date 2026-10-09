// Whether a signed-in account must be turned away: its own status, or (for
// everyone but super admins) its academy's status. Pure — shared by the
// middleware and the browser login flow. `academy` is the embedded academies row.
export type BlockedReason = "account_suspended" | "academy_suspended";

export function blockedReason(profile: { role?: unknown; status?: unknown; academy?: unknown } | null | undefined): BlockedReason | null {
  if (!profile) return null;
  if (profile.status === "suspended") return "account_suspended";
  const academy = Array.isArray(profile.academy) ? profile.academy[0] : profile.academy;
  const academyStatus = typeof academy === "object" && academy !== null ? (academy as { status?: unknown }).status : null;
  if (profile.role !== "super_admin" && academyStatus === "suspended") return "academy_suspended";
  return null;
}

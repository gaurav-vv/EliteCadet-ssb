"use client";

import { useEffect } from "react";
import { recoveryRedirectFor } from "@/lib/auth/recovery-hash";

// Mounted once in the root layout. If a password-reset or invite link ended up on another page with its
// result in the URL hash (see lib/auth/recovery-hash.ts), send the visitor to the right page instead of
// leaving them on the home page. Renders nothing.
export function RecoveryLinkRedirect() {
  useEffect(() => {
    const target = recoveryRedirectFor(window.location.hash, window.location.pathname);
    if (target) window.location.replace(target);
  }, []);
  return null;
}

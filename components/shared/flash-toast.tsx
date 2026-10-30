"use client";

import { useEffect, useState } from "react";
import { Toast } from "@/components/academy/shared/toast";
import { takeFlash } from "@/lib/flash";

const SHOW_MS = 7000;

// Shows (once) the message an earlier screen left with setFlash(), for example "Your account has been
// created successfully!" after sign-up redirects to the dashboard. Reuses the app's one Toast.
export function FlashToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Read after mount: the server render has no storage, so reading earlier would not match it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessage(takeFlash());
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), SHOW_MS);
    return () => clearTimeout(timer);
  }, [message]);

  return message ? <Toast message={message} tone="success" onDismiss={() => setMessage(null)} /> : null;
}

"use client";

import { useEffect, useRef, useState } from "react";

// Callers reset the countdown by remounting this hook's component with a new
// `key` (fresh item/phase) rather than by passing a new `totalSeconds` — two
// consecutive items can share the same duration (e.g. every WAT word is
// 15s), so a value-based reset would silently fail to reset.
export function useCountdown(totalSeconds: number, onExpire: () => void): number {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (!expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current();
      }
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  return secondsLeft;
}

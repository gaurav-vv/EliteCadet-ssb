"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";

interface ToastProps {
  message: string;
  tone?: "success" | "error";
  onDismiss: () => void;
}

// Transient feedback for an action. The owner holds the state and clears it
// (usually after a few seconds). Success is announced politely; errors assertively.
export function Toast({ message, tone = "success", onDismiss }: ToastProps) {
  const isError = tone === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className="fixed bottom-6 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-card border border-hairline bg-white px-4 py-3 shadow-md"
    >
      {isError ? (
        <AlertCircle aria-hidden="true" size={18} className="shrink-0 text-danger" />
      ) : (
        <CheckCircle2 aria-hidden="true" size={18} className="shrink-0 text-success" />
      )}
      <p className="flex-1 text-[13px] text-ink">{message}</p>
      <button
        type="button"
        aria-label="Dismiss message"
        onClick={onDismiss}
        className="flex size-8 shrink-0 items-center justify-center rounded-button text-ink-secondary hover:bg-black/5"
      >
        <X aria-hidden="true" size={14} />
      </button>
    </div>
  );
}

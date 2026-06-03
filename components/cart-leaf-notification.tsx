"use client";

import { useEffect } from "react";
import { Check, Leaf } from "lucide-react";

type CartLeafNotificationProps = {
  message: string;
  onDismiss: () => void;
  tone?: "success" | "warning";
};

export function CartLeafNotification({ message, onDismiss, tone = "success" }: CartLeafNotificationProps) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(onDismiss, 1800);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) {
    return null;
  }

  const isWarning = tone === "warning";

  return (
    <div className="fixed left-1/2 top-20 z-[70] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 sm:left-auto sm:right-5 sm:top-5 sm:w-auto sm:translate-x-0">
      <div className={`flex items-center gap-3 rounded-[22px_22px_22px_6px] border bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.18)] ${isWarning ? "border-amber-200" : "border-lime-200"}`}>
        <span className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full ${isWarning ? "bg-amber-300 text-amber-950" : "bg-lime-300 text-lime-950"}`}>
          <Leaf className="h-5 w-5" />
          <span className={`absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full text-white ${isWarning ? "bg-amber-700" : "bg-emerald-600"}`}>
            <Check className="h-3 w-3" />
          </span>
        </span>
        <span>{message}</span>
      </div>
    </div>
  );
}

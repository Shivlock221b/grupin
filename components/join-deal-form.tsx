"use client";

import { useActionState } from "react";
import { submitDealInterest, type ActionState } from "@/lib/actions";

const initialState: ActionState = {
  success: false,
  message: "",
};

type JoinDealFormProps = {
  dealId: string;
  city: string;
};

export function JoinDealForm({ dealId, city }: JoinDealFormProps) {
  const [state, formAction, pending] = useActionState(submitDealInterest, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-[2rem] bg-white p-6 shadow-[0_24px_60px_rgba(58,80,64,0.10)]">
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="city" value={city} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-[var(--forest)]">
          Full name
          <input
            required
            name="fullName"
            className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3"
            placeholder="Your name"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-[var(--forest)]">
          Email
          <input
            required
            type="email"
            name="email"
            className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3"
            placeholder="you@example.com"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-[var(--forest)]">
          Phone / WhatsApp
          <input
            required
            name="phone"
            className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3"
            placeholder="+91 98..."
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-[var(--forest)]">
          Area
          <input
            name="area"
            className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3"
            placeholder="Neighborhood"
          />
        </label>
      </div>
      <label className="flex items-center gap-3 text-sm text-[rgba(22,38,32,0.72)]">
        <input type="checkbox" name="whatsappOptIn" className="h-4 w-4 rounded border-[rgba(22,38,32,0.3)]" />
        Send updates on WhatsApp as well as email.
      </label>
      <div className="rounded-2xl bg-[var(--mist)] px-4 py-3 text-sm text-[rgba(22,38,32,0.72)]">
        Joining this page counts immediately toward unlocking the deal. No payment is collected here.
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[var(--forest)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving your details..." : "Join This Deal"}
      </button>
      {state.message ? (
        <p className={state.success ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p>
      ) : null}
    </form>
  );
}

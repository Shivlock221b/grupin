"use client";

import { useActionState } from "react";
import { requestAdminLoginAction, type ActionState } from "@/lib/actions";

const initialState: ActionState = {
  success: false,
  message: "",
};

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(requestAdminLoginAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-[2rem] bg-white p-8 shadow-[0_24px_70px_rgba(58,80,64,0.10)]">
      <label className="space-y-2 text-sm font-medium text-[var(--forest)]">
        Admin keyword
        <input
          required
          type="password"
          name="keyword"
          className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3"
          placeholder="Enter keyword"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[var(--forest)] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Checking..." : "Enter admin portal"}
      </button>
      {state.message ? (
        <p className={state.success ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p>
      ) : null}
    </form>
  );
}

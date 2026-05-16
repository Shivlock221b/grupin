"use client";

import { FormEvent, useState } from "react";
import { AccountProfile } from "@/lib/types";

type AccountProfileFormProps = {
  profile: AccountProfile;
};

export function AccountProfileForm({ profile }: AccountProfileFormProps) {
  const [form, setForm] = useState({
    name: profile.fullName,
    email: profile.email,
    phone: profile.phone,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not update profile.");
      }

      setForm({
        name: payload.profile.fullName,
        email: payload.profile.email,
        phone: payload.profile.phone,
      });
      setMessage("Account details updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update profile.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={saveProfile} className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <div className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 outline-none focus:border-emerald-500"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Email for voucher delivery
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 outline-none focus:border-emerald-500"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Phone
          <input
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 outline-none focus:border-emerald-500"
          />
        </label>
      </div>

      {message ? <p className="mt-4 rounded-[8px] bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-[8px] bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}

      <button disabled={pending} className="mt-5 h-12 w-full rounded-[8px] bg-slate-950 px-5 text-sm font-semibold text-white disabled:bg-slate-400">
        {pending ? "Saving..." : "Save details"}
      </button>
    </form>
  );
}

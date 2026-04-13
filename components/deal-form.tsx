"use client";

import { useActionState } from "react";
import { type ActionState } from "@/lib/actions";
import { Deal } from "@/lib/types";

const initialState: ActionState = {
  success: false,
  message: "",
};

type DealFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  deal?: Deal | null;
  submitLabel: string;
};

export function DealForm({ action, deal, submitLabel }: DealFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} encType="multipart/form-data" className="space-y-6 rounded-[2rem] bg-white p-8 shadow-[0_24px_70px_rgba(58,80,64,0.10)]">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-[var(--forest)]">
          Title
          <input name="title" defaultValue={deal?.title} required className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm font-medium text-[var(--forest)]">
          Merchant
          <input name="merchant" defaultValue={deal?.merchant} required className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm font-medium text-[var(--forest)]">
          Category
          <input name="category" defaultValue={deal?.category} required className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm font-medium text-[var(--forest)]">
          City
          <input name="city" defaultValue={deal?.city ?? "Bengaluru"} required className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm font-medium text-[var(--forest)]">
          Area
          <input name="area" defaultValue={deal?.area} required className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm font-medium text-[var(--forest)]">
          Discount Percent
          <input name="discountPercent" type="number" defaultValue={deal?.discountPercent} required className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm font-medium text-[var(--forest)]">
          Minimum interest count
          <input name="minimumInterestCount" type="number" defaultValue={deal?.minimumInterestCount} required className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm font-medium text-[var(--forest)]">
          Close date
          <input name="closeDate" type="date" defaultValue={deal?.closeDate ?? ""} className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm font-medium text-[var(--forest)] md:col-span-2">
          Hero image URL
          <input name="heroImage" type="url" defaultValue={deal?.heroImage} placeholder="https://..." className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm font-medium text-[var(--forest)] md:col-span-2">
          Or upload hero image
          <input name="heroImageFile" type="file" accept="image/*" className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3" />
          <span className="block text-xs text-[rgba(22,38,32,0.62)]">
            Add either an image URL or upload a file. Uploads go to your Supabase storage bucket in production.
          </span>
        </label>
        <label className="space-y-2 text-sm font-medium text-[var(--forest)] md:col-span-2">
          Credit description
          <input name="creditDescription" defaultValue={deal?.creditDescription} required className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm font-medium text-[var(--forest)] md:col-span-2">
          Description
          <textarea name="description" defaultValue={deal?.description} required rows={4} className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm font-medium text-[var(--forest)] md:col-span-2">
          Terms, one per line
          <textarea name="terms" defaultValue={deal?.terms.join("\n")} required rows={4} className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm font-medium text-[var(--forest)]">
          Status
          <select name="status" defaultValue={deal?.status ?? "draft"} className="w-full rounded-2xl border border-[rgba(22,38,32,0.14)] bg-[var(--mist)] px-4 py-3">
            <option value="draft">Draft</option>
            <option value="live">Live</option>
            <option value="threshold_met">Threshold Met</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="flex items-center gap-3 pt-8 text-sm text-[rgba(22,38,32,0.72)]">
          <input type="checkbox" name="featured" defaultChecked={deal?.featured} className="h-4 w-4 rounded border-[rgba(22,38,32,0.3)]" />
          Feature this deal on the landing page
        </label>
      </div>
      <button type="submit" disabled={pending} className="rounded-full bg-[var(--forest)] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving..." : submitLabel}
      </button>
      {state.message ? (
        <p className={state.success ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p>
      ) : null}
    </form>
  );
}

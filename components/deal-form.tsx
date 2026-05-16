"use client";

import { type ReactNode } from "react";
import { useActionState } from "react";
import { type ActionState } from "@/lib/actions";
import { AdminPrivateUnlockDeal } from "@/lib/types";

const initialState: ActionState = {
  success: false,
  message: "",
};

type DealFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  deal?: AdminPrivateUnlockDeal | null;
  submitLabel: string;
};

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`space-y-2 text-sm font-medium text-slate-800 ${wide ? "md:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}

const inputClass = "w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-400";

export function DealForm({ action, deal, submitLabel }: DealFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const defaultFinalPayable = deal?.finalPayableAfterUnlock ?? deal?.deal.tiers[0]?.price ?? 300;

  return (
    <form action={formAction} className="space-y-7 rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Voucher Listing</h2>
          <p className="text-sm text-slate-500">These fields power the marketplace card, hero, and `/private-unlock/[dealId]` page.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Brand name">
            <input name="brandName" defaultValue={deal?.brandName ?? deal?.merchant} required className={inputClass} />
          </Field>
          <Field label="Deal title">
            <input name="title" defaultValue={deal?.title} required className={inputClass} />
          </Field>
          <Field label="Slug">
            <input name="slug" defaultValue={deal?.slug ?? ""} placeholder="auto-created if blank" className={inputClass} />
          </Field>
          <Field label="Merchant">
            <input name="merchant" defaultValue={deal?.merchant ?? ""} placeholder="defaults to brand name" className={inputClass} />
          </Field>
          <Field label="Category">
            <input name="category" defaultValue={deal?.category} required className={inputClass} />
          </Field>
          <Field label="Coupon prefix">
            <input name="couponPrefix" defaultValue={deal?.couponPrefix ?? "GRUPIN"} required className={inputClass} />
          </Field>
          <Field label="Headline" wide>
            <input name="headline" defaultValue={deal?.headline} required className={inputClass} />
          </Field>
          <Field label="Short description" wide>
            <textarea name="shortDescription" defaultValue={deal?.shortDescription} required rows={2} className={inputClass} />
          </Field>
          <Field label="Full description" wide>
            <textarea name="description" defaultValue={deal?.description ?? deal?.shortDescription} required rows={3} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Unlock Economics</h2>
          <p className="text-sm text-slate-500">Token amount is in rupees; the app converts it to paise for Razorpay orders.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Voucher value">
            <input name="voucherValue" type="number" min={1} defaultValue={deal?.voucherValue ?? deal?.deal.originalPrice ?? 500} required className={inputClass} />
          </Field>
          <Field label="Discount %">
            <input name="discountPercent" type="number" min={1} max={100} defaultValue={deal?.discountPercent ?? 40} required className={inputClass} />
          </Field>
          <Field label="Token amount">
            <input name="tokenAmount" type="number" min={0} defaultValue={deal?.tokenAmount ?? 49} required className={inputClass} />
          </Field>
          <Field label="Join threshold">
            <input name="threshold" type="number" min={1} defaultValue={deal?.threshold ?? 3} required className={inputClass} />
          </Field>
          <Field label="Flat discount">
            <input name="flatDiscountAmount" type="number" min={0} defaultValue={deal?.flatDiscountAmount ?? 200} required className={inputClass} />
          </Field>
          <Field label="Final payable after unlock">
            <input name="finalPayableAfterUnlock" type="number" min={0} step="1" defaultValue={defaultFinalPayable} className={inputClass} />
          </Field>
          <Field label="Scraped discount %">
            <input name="scrapedDiscountPercent" type="number" min={0} max={100} step="0.01" defaultValue={deal?.scrapedDiscountPercent ?? ""} className={inputClass} />
          </Field>
          <Field label="Sort order">
            <input name="sortOrder" type="number" min={0} defaultValue={deal?.sortOrder ?? 100} required className={inputClass} />
          </Field>
          <Field label="Coupon stock total">
            <input name="couponStockTotal" type="number" min={0} defaultValue={deal?.couponStockTotal ?? 12} required className={inputClass} />
          </Field>
          <Field label="Coupons claimed">
            <input name="couponStockClaimed" type="number" min={0} defaultValue={deal?.couponStockClaimed ?? 0} required className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Assets And Source</h2>
          <p className="text-sm text-slate-500">Use direct URLs for logos, cards, banners, and the external voucher source.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Card image URL" wide>
            <input name="cardImage" type="url" defaultValue={deal?.cardImage} required className={inputClass} />
          </Field>
          <Field label="Banner image URL" wide>
            <input name="bannerImage" type="url" defaultValue={deal?.bannerImage} required className={inputClass} />
          </Field>
          <Field label="Brand logo URL">
            <input name="brandLogo" type="url" defaultValue={deal?.brandLogo ?? ""} className={inputClass} />
          </Field>
          <Field label="Voucher URL">
            <input name="voucherUrl" type="url" defaultValue={deal?.voucherUrl ?? ""} className={inputClass} />
          </Field>
          <Field label="Source">
            <input name="source" defaultValue={deal?.source ?? ""} placeholder="woohoo / gyftr" className={inputClass} />
          </Field>
          <Field label="Source file">
            <input name="sourceFile" defaultValue={deal?.sourceFile ?? ""} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Field label="Deal status">
          <select name="status" defaultValue={deal?.status ?? "live"} className={inputClass}>
            <option value="draft">Draft</option>
            <option value="live">Live</option>
            <option value="threshold_met">Threshold met</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
        <label className="flex items-center gap-3 rounded-[8px] border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" name="enabled" defaultChecked={deal?.enabled ?? true} className="h-4 w-4 rounded border-slate-300" />
          Enabled in marketplace
        </label>
        <label className="flex items-center gap-3 rounded-[8px] border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" name="featured" defaultChecked={deal?.featured ?? false} className="h-4 w-4 rounded border-slate-300" />
          Featured
        </label>
        <label className="flex items-center gap-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
          <input type="checkbox" name="forceOutOfStock" defaultChecked={Boolean(deal && deal.couponStockClaimed >= deal.couponStockTotal)} className="h-4 w-4 rounded border-rose-300" />
          Mark out of stock
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-[8px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving..." : submitLabel}
        </button>
        {state.message ? (
          <p className={state.success ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}

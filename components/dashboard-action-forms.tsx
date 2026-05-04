"use client";

import { useActionState } from "react";
import { type ActionState } from "@/lib/actions";
import { Brand, DashboardDeal, DashboardReservation } from "@/lib/types";

const initialState: ActionState = {
  success: false,
  message: "",
};

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) {
    return null;
  }

  return <p className={state.success ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p>;
}

export function BrandForm({
  action,
  brand,
  submitLabel,
}: {
  action: Action;
  brand?: Brand | null;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-[8px] border border-slate-200 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Brand name
          <input name="name" required defaultValue={brand?.name} className="h-11 w-full rounded-[8px] border border-slate-200 px-3" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Slug
          <input name="slug" defaultValue={brand?.slug} className="h-11 w-full rounded-[8px] border border-slate-200 px-3" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Logo URL
          <input name="logoUrl" type="url" defaultValue={brand?.logoUrl ?? ""} className="h-11 w-full rounded-[8px] border border-slate-200 px-3" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Website URL
          <input name="websiteUrl" type="url" defaultValue={brand?.websiteUrl ?? ""} className="h-11 w-full rounded-[8px] border border-slate-200 px-3" />
        </label>
      </div>
      <button disabled={pending} className="rounded-[8px] bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving..." : submitLabel}
      </button>
      <FormMessage state={state} />
    </form>
  );
}

export function BrandUserForm({ action, brandId }: { action: Action; brandId: string }) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-[8px] border border-slate-200 bg-white p-5">
      <input type="hidden" name="brandId" value={brandId} />
      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Partner email
          <input name="email" required type="email" className="h-11 w-full rounded-[8px] border border-slate-200 px-3" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Role
          <select name="role" defaultValue="viewer" className="h-11 w-full rounded-[8px] border border-slate-200 px-3">
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="viewer">Viewer</option>
          </select>
        </label>
      </div>
      <button disabled={pending} className="rounded-[8px] bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving..." : "Add partner user"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}

export function DealControlForm({ action, deal }: { action: Action; deal: DashboardDeal }) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-[8px] border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_120px_170px_auto]">
      <input type="hidden" name="dealId" value={deal.id} />
      <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        Status
        <select name="status" defaultValue={deal.status ?? "live"} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm font-medium normal-case tracking-normal text-slate-900">
          <option value="draft">Draft</option>
          <option value="live">Live</option>
          <option value="threshold_met">Threshold met</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        Count
        <input name="currentCount" type="number" min={0} defaultValue={deal.currentCount} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm font-medium normal-case tracking-normal text-slate-900" />
      </label>
      <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        Expires
        <input name="expiresAt" type="datetime-local" defaultValue={deal.expiresAt ? deal.expiresAt.slice(0, 16) : ""} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm font-medium normal-case tracking-normal text-slate-900" />
      </label>
      <div className="flex items-end">
        <button disabled={pending} className="h-10 rounded-[8px] bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-60">
          Save
        </button>
      </div>
      <div className="sm:col-span-4">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function ReservationStatusForm({ action, reservation }: { action: Action; reservation: DashboardReservation }) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="reservationId" value={reservation.id} />
      <select name="paymentStatus" defaultValue={reservation.paymentStatus} className="h-9 rounded-[8px] border border-slate-200 px-2 text-xs font-semibold">
        <option value="created">Created</option>
        <option value="paid">Paid</option>
        <option value="failed">Failed</option>
        <option value="refunded">Refunded</option>
      </select>
      <select name="finalPurchaseStatus" defaultValue={reservation.finalPurchaseStatus} className="h-9 rounded-[8px] border border-slate-200 px-2 text-xs font-semibold">
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <button disabled={pending} className="h-9 rounded-[8px] bg-slate-950 px-3 text-xs font-semibold text-white disabled:opacity-60">
        Save
      </button>
      <FormMessage state={state} />
    </form>
  );
}

export function DealBrandAssignmentForm({
  action,
  brands,
  currentBrandId,
}: {
  action: Action;
  brands: Brand[];
  currentBrandId?: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-[8px] border border-slate-200 bg-white p-4">
      <label className="space-y-1 text-sm font-medium text-slate-700">
        Brand owner
        <select name="brandId" defaultValue={currentBrandId ?? ""} className="h-11 w-full rounded-[8px] border border-slate-200 px-3">
          <option value="">Unassigned</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>{brand.name}</option>
          ))}
        </select>
      </label>
      <button disabled={pending} className="rounded-[8px] bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving..." : "Assign brand"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { type ActionState } from "@/lib/actions";
import { AdminBrandProduct, AdminCouponClaim, AdminPrivateUnlockDeal, AdminPrivateUnlockMember, AdminProductTeamOrder, AdminProductTeamUnlock, Brand, DashboardDeal, DashboardReservation } from "@/lib/types";

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

export function PlatformCouponInventoryForm({
  action,
  total,
  claimed,
}: {
  action: Action;
  total: number;
  claimed: number;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-[8px] border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
      <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        Global coupon limit
        <input name="total" type="number" min={0} defaultValue={total} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm font-medium normal-case tracking-normal text-slate-900" />
      </label>
      <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        Coupons unlocked
        <input name="claimed" type="number" min={0} defaultValue={claimed} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm font-medium normal-case tracking-normal text-slate-900" />
      </label>
      <div className="flex items-end">
        <button disabled={pending} className="h-10 rounded-[8px] bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving..." : "Save inventory"}
        </button>
      </div>
      <div className="sm:col-span-3">
        <p className="mb-2 text-xs text-slate-500">Set coupons unlocked equal to the limit, for example 100/100, to disable new joins across all deals.</p>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function TelegramTestForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="rounded-[8px] border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">Telegram alerts</p>
          <p className="text-sm text-slate-500">Send a test message to the configured admin chat.</p>
        </div>
        <button disabled={pending} className="h-10 rounded-[8px] bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Sending..." : "Send test"}
        </button>
      </div>
      <div className="mt-3">
        <FormMessage state={state} />
      </div>
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

export function PrivateUnlockMemberStatusForm({
  action,
  member,
}: {
  action: Action;
  member: AdminPrivateUnlockMember;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="memberId" value={member.id} />
      <select name="paymentStatus" defaultValue={member.paymentStatus} className="h-9 rounded-[8px] border border-slate-200 px-2 text-xs font-semibold">
        <option value="created">Created</option>
        <option value="paid">Paid</option>
        <option value="failed">Failed</option>
        <option value="refunded">Refunded</option>
      </select>
      <button disabled={pending} className="h-9 rounded-[8px] bg-slate-950 px-3 text-xs font-semibold text-white disabled:opacity-60">
        Save
      </button>
      <FormMessage state={state} />
    </form>
  );
}

export function CouponClaimDeliveryForm({
  action,
  claim,
}: {
  action: Action;
  claim: AdminCouponClaim;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="claimId" value={claim.id} />
      <select name="emailDeliveryStatus" defaultValue={claim.emailDeliveryStatus} className="h-9 rounded-[8px] border border-slate-200 px-2 text-xs font-semibold">
        <option value="not_requested">Not requested</option>
        <option value="pending">Pending</option>
        <option value="delivered">Delivered</option>
      </select>
      <button disabled={pending} className="h-9 rounded-[8px] bg-slate-950 px-3 text-xs font-semibold text-white disabled:opacity-60">
        Save
      </button>
      <FormMessage state={state} />
    </form>
  );
}

export function DummyUnlockMemberForm({
  action,
  unlockId,
  dealId,
}: {
  action: Action;
  unlockId: string;
  dealId: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-2 rounded-[8px] border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4">
      <input type="hidden" name="unlockId" value={unlockId} />
      <input type="hidden" name="dealId" value={dealId} />
      <input name="name" required placeholder="Name" className="h-9 rounded-[8px] border border-slate-200 px-2 text-sm" />
      <input name="phone" required placeholder="Phone" className="h-9 rounded-[8px] border border-slate-200 px-2 text-sm" />
      <input name="email" required type="email" placeholder="Email" className="h-9 rounded-[8px] border border-slate-200 px-2 text-sm" />
      <button disabled={pending} className="h-9 rounded-[8px] bg-slate-950 px-3 text-xs font-semibold text-white disabled:opacity-60">
        {pending ? "Adding..." : "Add dummy"}
      </button>
      <div className="sm:col-span-4">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function DummyUnlockRoomForm({
  action,
  deals,
}: {
  action: Action;
  deals: AdminPrivateUnlockDeal[];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-[8px] border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_auto]">
      <select name="dealId" required className="h-10 rounded-[8px] border border-slate-200 px-3 text-sm font-semibold text-slate-800">
        <option value="">Choose deal</option>
        {deals.map((deal) => (
          <option key={deal.dealId} value={deal.dealId}>
            {deal.brandName} · {deal.threshold} people
          </option>
        ))}
      </select>
      <button disabled={pending} className="h-10 rounded-[8px] bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Creating..." : "Create dummy room"}
      </button>
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function UnlockRoomControlForm({
  action,
  unlockId,
  expiresAt,
}: {
  action: Action;
  unlockId: string;
  expiresAt: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isExpired = new Date(expiresAt).getTime() <= Date.now();

  return (
    <form action={formAction} className="grid gap-2 rounded-[8px] border border-slate-200 bg-white p-3 sm:grid-cols-[120px_1fr_auto]">
      <input type="hidden" name="unlockId" value={unlockId} />
      <select name="status" defaultValue={isExpired ? "expired" : "active"} className="h-9 rounded-[8px] border border-slate-200 px-2 text-xs font-semibold">
        <option value="active">Active</option>
        <option value="expired">Expired</option>
      </select>
      <input name="expiresAt" type="datetime-local" defaultValue={expiresAt.slice(0, 16)} className="h-9 rounded-[8px] border border-slate-200 px-2 text-xs font-semibold" />
      <button disabled={pending} className="h-9 rounded-[8px] bg-slate-950 px-3 text-xs font-semibold text-white disabled:opacity-60">
        Save room
      </button>
      <div className="sm:col-span-3">
        <FormMessage state={state} />
      </div>
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

export function ProductAdminForm({
  action,
  product,
  brands,
}: {
  action: Action;
  product?: AdminBrandProduct | null;
  brands: Brand[];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5 rounded-[8px] border border-slate-200 bg-white p-5">
      {product ? <input type="hidden" name="productId" value={product.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Brand
          <select name="brandId" required defaultValue={product?.brandId ?? ""} className="h-11 w-full rounded-[8px] border border-slate-200 px-3">
            <option value="">Choose brand</option>
            {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Title
          <input name="title" required defaultValue={product?.title ?? ""} className="h-11 w-full rounded-[8px] border border-slate-200 px-3" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Slug
          <input name="slug" defaultValue={product?.slug ?? ""} className="h-11 w-full rounded-[8px] border border-slate-200 px-3" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Vendor
          <input name="vendor" defaultValue={product?.vendor ?? ""} className="h-11 w-full rounded-[8px] border border-slate-200 px-3" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Primary image
          <input name="primaryImage" type="url" defaultValue={product?.primaryImage ?? ""} className="h-11 w-full rounded-[8px] border border-slate-200 px-3" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Product URL
          <input name="sourceUrl" type="url" defaultValue={product?.sourceUrl ?? product?.productUrl ?? ""} className="h-11 w-full rounded-[8px] border border-slate-200 px-3" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          MRP
          <input name="mrp" type="number" min={0} step="0.01" defaultValue={product?.mrp ?? ""} className="h-11 w-full rounded-[8px] border border-slate-200 px-3" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Sale price
          <input name="salePrice" type="number" min={0} step="0.01" defaultValue={product?.salePrice ?? ""} className="h-11 w-full rounded-[8px] border border-slate-200 px-3" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Source discount %
          <input name="sourceDiscountPercent" type="number" min={0} max={100} step="0.01" defaultValue={product?.sourceDiscountPercent ?? ""} className="h-11 w-full rounded-[8px] border border-slate-200 px-3" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Rating
          <input name="rating" type="number" min={0} max={5} step="0.01" defaultValue={product?.rating ?? ""} className="h-11 w-full rounded-[8px] border border-slate-200 px-3" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Rating count
          <input name="ratingCount" type="number" min={0} defaultValue={product?.ratingCount ?? ""} className="h-11 w-full rounded-[8px] border border-slate-200 px-3" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Variant type
          <input name="variantType" placeholder="shade or size" defaultValue={product?.variantType ?? ""} className="h-11 w-full rounded-[8px] border border-slate-200 px-3" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Variant count
          <input name="variantCount" type="number" min={0} defaultValue={product?.variantCount ?? product?.variants.length ?? ""} className="h-11 w-full rounded-[8px] border border-slate-200 px-3" />
        </label>
        <label className="flex items-center gap-2 pt-7 text-sm font-semibold text-slate-700">
          <input name="inStock" type="checkbox" defaultChecked={product?.inStock ?? true} />
          In stock
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Tags, comma or newline separated
          <textarea name="tags" rows={3} defaultValue={product?.tags.join(", ") ?? ""} className="w-full rounded-[8px] border border-slate-200 px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Product types
          <textarea name="productTypes" rows={3} defaultValue={product?.productTypes.join(", ") ?? ""} className="w-full rounded-[8px] border border-slate-200 px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Image URLs
          <textarea name="imageUrls" rows={4} defaultValue={product?.imageUrls.join("\n") ?? ""} className="w-full rounded-[8px] border border-slate-200 px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Variants JSON
          <textarea name="variants" rows={4} defaultValue={JSON.stringify(product?.variants ?? [], null, 2)} className="w-full rounded-[8px] border border-slate-200 px-3 py-2 font-mono text-xs" />
        </label>
      </div>
      <label className="space-y-1 text-sm font-medium text-slate-700">
        Description
        <textarea name="description" rows={3} defaultValue={product?.description ?? ""} className="w-full rounded-[8px] border border-slate-200 px-3 py-2" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-slate-700">
          How to use
          <textarea name="howToUse" rows={4} defaultValue={product?.howToUse ?? ""} className="w-full rounded-[8px] border border-slate-200 px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Ingredients
          <textarea name="ingredients" rows={4} defaultValue={product?.ingredients ?? ""} className="w-full rounded-[8px] border border-slate-200 px-3 py-2" />
        </label>
      </div>
      <button disabled={pending} className="rounded-[8px] bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving..." : product ? "Save product" : "Create product"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}

export function DummyProductRoomForm({
  action,
  products,
}: {
  action: Action;
  products: AdminBrandProduct[];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-[8px] border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_auto]">
      <select name="productId" required className="h-10 rounded-[8px] border border-slate-200 px-3 text-sm font-semibold text-slate-800">
        <option value="">Choose product</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>{product.brand?.name} · {product.title}</option>
        ))}
      </select>
      <button disabled={pending} className="h-10 rounded-[8px] bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Creating..." : "Create dummy room"}
      </button>
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
    </form>
  );
}

export function ProductTeamRoomControlForm({
  action,
  room,
}: {
  action: Action;
  room: AdminProductTeamUnlock;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-2 rounded-[8px] border border-slate-200 bg-white p-3 sm:grid-cols-[130px_90px_90px_1fr_auto]">
      <input type="hidden" name="unlockId" value={room.id} />
      <select name="status" defaultValue={room.status} className="h-9 rounded-[8px] border border-slate-200 px-2 text-xs font-semibold">
        <option value="active">Active</option>
        <option value="unlocked">Unlocked</option>
        <option value="expired">Expired</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <input name="threshold" type="number" min={1} defaultValue={room.threshold} className="h-9 rounded-[8px] border border-slate-200 px-2 text-xs font-semibold" />
      <input name="currentCount" type="number" min={0} defaultValue={room.currentCount} className="h-9 rounded-[8px] border border-slate-200 px-2 text-xs font-semibold" />
      <input name="expiresAt" type="datetime-local" defaultValue={room.expiresAt.slice(0, 16)} className="h-9 rounded-[8px] border border-slate-200 px-2 text-xs font-semibold" />
      <button disabled={pending} className="h-9 rounded-[8px] bg-slate-950 px-3 text-xs font-semibold text-white disabled:opacity-60">Save</button>
      <div className="sm:col-span-5"><FormMessage state={state} /></div>
    </form>
  );
}

export function DummyProductMemberForm({
  action,
  room,
}: {
  action: Action;
  room: AdminProductTeamUnlock;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-2 rounded-[8px] border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_auto]">
      <input type="hidden" name="unlockId" value={room.id} />
      <input type="hidden" name="productId" value={room.productId} />
      <input type="hidden" name="brandId" value={room.brandId} />
      <input name="phone" required placeholder="Phone" className="h-9 rounded-[8px] border border-slate-200 px-2 text-sm" />
      <button disabled={pending} className="h-9 rounded-[8px] bg-slate-950 px-3 text-xs font-semibold text-white disabled:opacity-60">{pending ? "Adding..." : "Add dummy member"}</button>
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
    </form>
  );
}

export function ProductTeamOrderStatusForm({
  action,
  order,
}: {
  action: Action;
  order: AdminProductTeamOrder;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="orderId" value={order.id} />
      <select name="status" defaultValue={order.status} className="h-9 rounded-[8px] border border-slate-200 px-2 text-xs font-semibold">
        <option value="hold">Hold</option>
        <option value="confirmed">Confirmed</option>
        <option value="refund_pending">Refund pending</option>
        <option value="refunded">Refunded</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <input name="amountPaid" type="number" min={0} defaultValue={order.amountPaid} className="h-9 w-28 rounded-[8px] border border-slate-200 px-2 text-xs font-semibold" />
      <button disabled={pending} className="h-9 rounded-[8px] bg-slate-950 px-3 text-xs font-semibold text-white disabled:opacity-60">Save</button>
      <FormMessage state={state} />
    </form>
  );
}

export function ProductOrderTrackingUpdateForm({
  action,
  order,
}: {
  action: Action;
  order: AdminProductTeamOrder;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-3 grid gap-2 rounded-[8px] border border-slate-200 bg-slate-50 p-3">
      <input type="hidden" name="orderId" value={order.id} />
      <div className="grid gap-2 sm:grid-cols-[160px_1fr_auto]">
        <select name="status" defaultValue="processing" className="h-9 rounded-[8px] border border-slate-200 px-2 text-xs font-semibold">
          <option value="processing">Processing</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="out_for_delivery">Out for delivery</option>
          <option value="delivered">Delivered</option>
          <option value="confirmed">Confirmed</option>
          <option value="refund_pending">Refund pending</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input name="remark" placeholder="Remark visible to user" className="h-9 rounded-[8px] border border-slate-200 px-2 text-xs font-semibold" />
        <button disabled={pending} className="h-9 rounded-[8px] bg-cyan-700 px-3 text-xs font-semibold text-white disabled:opacity-60">{pending ? "Adding..." : "Add update"}</button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function DummyProductOrderForm({
  action,
  rooms,
}: {
  action: Action;
  rooms: AdminProductTeamUnlock[];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-[8px] border border-slate-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Room
          <select name="unlockId" required className="h-10 w-full rounded-[8px] border border-slate-200 px-3">
            <option value="">Choose room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>{room.productTitle} · {room.shareCode}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Product ID
          <select name="productId" required className="h-10 w-full rounded-[8px] border border-slate-200 px-3">
            <option value="">Choose product</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.productId}>{room.productTitle}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Brand ID
          <select name="brandId" required className="h-10 w-full rounded-[8px] border border-slate-200 px-3">
            <option value="">Choose brand</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.brandId}>{room.brandName}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Amount paid, paise
          <input name="amountPaid" type="number" min={0} defaultValue={0} className="h-10 w-full rounded-[8px] border border-slate-200 px-3" />
        </label>
        <input name="buyerName" required placeholder="Buyer name" className="h-10 rounded-[8px] border border-slate-200 px-3 text-sm" />
        <input name="buyerPhone" required placeholder="Buyer phone" className="h-10 rounded-[8px] border border-slate-200 px-3 text-sm" />
        <input name="buyerEmail" type="email" placeholder="Buyer email" className="h-10 rounded-[8px] border border-slate-200 px-3 text-sm sm:col-span-2" />
      </div>
      <button disabled={pending} className="h-10 rounded-[8px] bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Creating..." : "Create dummy order"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}

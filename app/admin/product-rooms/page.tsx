import Link from "next/link";
import { DummyProductMemberForm, DummyProductRoomForm, ProductTeamRoomControlForm } from "@/components/dashboard-action-forms";
import { addDummyProductTeamMemberAction, createDummyProductRoomAction, deleteProductTeamMemberAction, deleteProductTeamRoomAction, updateProductTeamRoomAction } from "@/lib/actions";
import { requireAdminOrRedirect } from "@/lib/auth";
import { listProductTeamUnlocksAdmin, listProductsAdmin } from "@/lib/data";

export default async function AdminProductRoomsPage() {
  await requireAdminOrRedirect();
  const [rooms, products] = await Promise.all([listProductTeamUnlocksAdmin(), listProductsAdmin()]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">Admin</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--forest)]">Product team rooms</h1>
        </div>
        <Link href="/admin/catalog" className="rounded-[8px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900">Catalog</Link>
      </div>

      <DummyProductRoomForm action={createDummyProductRoomAction} products={products} />

      <div className="space-y-4">
        {rooms.map((room) => (
          <div key={room.id} className="space-y-3 rounded-[8px] border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">{room.productTitle}</p>
                <p className="text-sm text-slate-500">{room.brandName} · {room.shareCode} · {room.currentCount}/{room.threshold}</p>
                <p className="text-xs font-semibold text-slate-400">{room.status} · expires {new Date(room.expiresAt).toLocaleString("en-IN")}</p>
              </div>
              <form action={deleteProductTeamRoomAction}>
                <input type="hidden" name="unlockId" value={room.id} />
                <button className="rounded-[8px] border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Delete room</button>
              </form>
            </div>
            <ProductTeamRoomControlForm action={updateProductTeamRoomAction} room={room} />
            <DummyProductMemberForm action={addDummyProductTeamMemberAction} room={room} />
            <div className="grid gap-2 sm:grid-cols-3">
              {room.members.map((member) => (
                <div key={member.id} className="rounded-[8px] bg-slate-50 p-3 text-xs">
                  <p className="font-semibold text-slate-900">{member.phone}</p>
                  <p className="text-slate-500">{member.role} · {member.selectedVariant?.variant_name ?? member.selectedVariant?.pack_size ?? "No variant"}</p>
                  <form action={deleteProductTeamMemberAction} className="mt-2">
                    <input type="hidden" name="memberId" value={member.id} />
                    <input type="hidden" name="unlockId" value={room.id} />
                    <button className="font-semibold text-red-700">Delete member</button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

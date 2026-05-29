import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { listAccountProductUnlockRooms } from "@/lib/data";

function statusLabel(status: string) {
  if (status === "unlocked") return "Unlocked";
  if (status === "expired") return "Expired";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return "Active";
}

export default async function AccountRoomsPage() {
  const profile = await getCurrentAccountProfile();

  if (!profile) {
    redirect("/login?next=/account/rooms");
  }

  const rooms = await listAccountProductUnlockRooms(profile.id);

  return (
    <main className="min-h-screen bg-[#f8faf8] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Account</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">Unlock rooms</h1>
            <p className="mt-2 text-slate-600">Track rooms you have joined, share active rooms, and continue when team price unlocks.</p>
          </div>
          <Link href="/account/orders" className="inline-flex h-11 items-center justify-center rounded-[8px] border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-950">
            Orders
          </Link>
        </div>

        {rooms.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {rooms.map((room) => {
              const expired = room.status === "expired" || new Date(room.expiresAt).getTime() <= Date.now();
              const unlocked = !expired && (room.status === "unlocked" || room.currentCount >= room.threshold);

              return (
                <div key={room.id} className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-cyan-700">{room.brandName}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${unlocked ? "bg-lime-100 text-lime-900" : expired ? "bg-rose-50 text-rose-700" : "bg-cyan-50 text-cyan-800"}`}>
                      {statusLabel(unlocked ? "unlocked" : room.status)}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-[8px] bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-500">Joined</p>
                      <p className="mt-1 font-semibold text-slate-950">{room.currentCount}/{room.threshold}</p>
                    </div>
                    <div className="rounded-[8px] bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-500">Role</p>
                      <p className="mt-1 capitalize font-semibold text-slate-950">{room.memberRole}</p>
                    </div>
                    <div className="rounded-[8px] bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-500">Code</p>
                      <p className="mt-1 font-semibold text-slate-950">{room.shareCode}</p>
                    </div>
                  </div>
                  <Link href={`/team-room/${room.shareCode}`} className="inline-flex h-11 items-center justify-center rounded-[8px] bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-600">
                    View room
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[8px] border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-semibold text-slate-950">No unlock rooms yet</h2>
            <p className="mt-2 text-sm text-slate-500">Start or join a team-price room and it will appear here.</p>
            <Link href="/catalog/l-oreal-paris" className="mt-5 inline-flex h-11 items-center justify-center rounded-[8px] bg-rose-500 px-5 text-sm font-semibold text-white transition hover:bg-rose-600">
              Explore products
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

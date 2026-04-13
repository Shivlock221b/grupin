import Link from "next/link";
import { AdminSignOutForm } from "@/components/admin-sign-out-form";
import { requireAdminOrRedirect } from "@/lib/auth";
import { listDealsAdmin, listNotificationEvents } from "@/lib/data";

export default async function AdminDealsPage() {
  const user = await requireAdminOrRedirect();
  const [deals, notifications] = await Promise.all([listDealsAdmin(), listNotificationEvents()]);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">Admin Dashboard</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--forest)]">Manage deal pages and unlocked groups</h1>
          <p className="max-w-2xl text-base leading-7 text-[rgba(22,38,32,0.72)]">
            Create shareable deal pages, watch the join count grow, and export the people you need to contact once a
            deal unlocks.
          </p>
          <p className="text-sm text-[rgba(22,38,32,0.62)]">Signed in as {user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/deals/new" className="rounded-full bg-[var(--forest)] px-6 py-3 text-sm font-semibold text-white">
            Create new deal
          </Link>
          <AdminSignOutForm />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_70px_rgba(58,80,64,0.10)]">
          <table className="min-w-full text-left">
            <thead className="bg-[var(--mist)] text-sm uppercase tracking-[0.18em] text-[var(--clay)]">
              <tr>
                <th className="px-6 py-4">Deal</th>
                <th className="px-6 py-4">Area</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Progress</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id} className="border-t border-[rgba(22,38,32,0.08)]">
                  <td className="px-6 py-5">
                    <p className="font-semibold text-[var(--forest)]">{deal.title}</p>
                    <p className="text-sm text-[rgba(22,38,32,0.68)]">{deal.category}</p>
                  </td>
                  <td className="px-6 py-5 text-sm text-[rgba(22,38,32,0.72)]">{deal.area}</td>
                  <td className="px-6 py-5">
                    <span className="rounded-full bg-[var(--mist)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--forest)]">
                      {deal.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-[rgba(22,38,32,0.72)]">
                    {deal.currentInterestCount}/{deal.minimumInterestCount}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-wrap gap-4 text-sm font-semibold text-[var(--forest)]">
                      <Link href={`/admin/deals/${deal.id}`}>Edit</Link>
                      <Link href={`/admin/deals/${deal.id}/interests`}>Interests</Link>
                      <Link href={`/api/admin/deals/${deal.id}/export`}>CSV Export</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-[2rem] bg-[var(--forest)] p-6 text-white">
          <p className="text-sm uppercase tracking-[0.2em] text-[rgba(255,255,255,0.72)]">Notification queue</p>
          <div className="mt-6 space-y-4">
            {notifications.slice(0, 6).map((event) => (
              <div key={event.id} className="rounded-[1.5rem] bg-white/8 p-4">
                <p className="text-sm font-semibold capitalize">{event.type.replaceAll("_", " ")}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[rgba(255,255,255,0.62)]">
                  {event.channel} • {event.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

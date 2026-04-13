import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminSignOutForm } from "@/components/admin-sign-out-form";
import { requireAdminOrRedirect } from "@/lib/auth";
import { getDealByIdAdmin, listInterestsByDeal } from "@/lib/data";

type DealInterestsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DealInterestsPage({ params }: DealInterestsPageProps) {
  const user = await requireAdminOrRedirect();
  const { id } = await params;
  const [deal, interests] = await Promise.all([getDealByIdAdmin(id), listInterestsByDeal(id)]);

  if (!deal) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">Joined People</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--forest)]">{deal.title}</h1>
          <p className="max-w-2xl text-base leading-7 text-[rgba(22,38,32,0.72)]">
            Export a CSV with email, phone, WhatsApp opt-in, and join timestamps for manual follow-up once the deal unlocks.
          </p>
          <p className="text-sm text-[rgba(22,38,32,0.62)]">Signed in as {user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/api/admin/deals/${deal.id}/export`} className="rounded-full bg-[var(--forest)] px-6 py-3 text-sm font-semibold text-white">
            Export CSV
          </Link>
          <AdminSignOutForm />
        </div>
      </div>
      <div className="space-y-4">
        {interests.map((interest) => (
          <div key={interest.id} className="rounded-[2rem] bg-white p-6 shadow-[0_18px_50px_rgba(58,80,64,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--forest)]">{interest.profile.fullName}</h2>
                <p className="mt-2 text-sm text-[rgba(22,38,32,0.72)]">{interest.profile.email}</p>
                <p className="text-sm text-[rgba(22,38,32,0.72)]">{interest.profile.phone}</p>
                <p className="text-sm text-[rgba(22,38,32,0.72)]">
                  {interest.profile.area ?? "Area not provided"} • {interest.profile.city ?? deal.city}
                </p>
              </div>
              <span className="rounded-full bg-[var(--mist)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--forest)]">
                {interest.status === "confirmed" ? "counted" : interest.status.replace("_", " ")}
              </span>
            </div>
          </div>
        ))}
      </div>
      {interests.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-[rgba(22,38,32,0.18)] px-8 py-14 text-center text-[rgba(22,38,32,0.72)]">
          No one has joined this deal yet.
        </div>
      ) : null}
    </div>
  );
}

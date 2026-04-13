import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listUserInterests } from "@/lib/data";

export default async function AccountInterestsPage() {
  const user = await getCurrentUser();
  const interests = user ? await listUserInterests(user.id) : [];

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">My Interests</p>
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--forest)]">Deals you’ve joined</h1>
        <p className="max-w-2xl text-base leading-7 text-[rgba(22,38,32,0.72)]">
          This page is optional for the simpler deal-page setup, but it is still available if you want a participant
          view of joined deals later.
        </p>
      </div>
      <div className="space-y-4">
        {interests.map((interest) => (
          <div key={interest.id} className="rounded-[2rem] bg-white p-6 shadow-[0_18px_50px_rgba(58,80,64,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--clay)]">
                  {interest.deal.category} • {interest.deal.area}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--forest)]">{interest.deal.title}</h2>
                <p className="mt-2 text-sm text-[rgba(22,38,32,0.72)]">{interest.deal.creditDescription}</p>
              </div>
              <div className="rounded-full bg-[var(--mist)] px-4 py-2 text-sm font-semibold capitalize text-[var(--forest)]">
                {interest.status.replace("_", " ")}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-4 text-sm text-[rgba(22,38,32,0.72)]">
              <span>{interest.deal.currentInterestCount} interested</span>
              <span>{interest.deal.minimumInterestCount} needed</span>
              <Link href={`/deals/${interest.deal.slug}`} className="font-semibold text-[var(--forest)] underline underline-offset-4">
                View deal
              </Link>
            </div>
          </div>
        ))}
      </div>
      {interests.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-[rgba(22,38,32,0.18)] px-8 py-14 text-center text-[rgba(22,38,32,0.72)]">
          You have not joined any deals yet.
        </div>
      ) : null}
    </div>
  );
}

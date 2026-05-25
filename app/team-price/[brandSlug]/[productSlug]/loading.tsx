export default function ProductTeamPriceLoading() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f3faf7] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="text-xl font-semibold tracking-tight text-emerald-950">GruPin</div>
          <div className="h-10 w-10 rounded-full bg-slate-100" />
        </div>
      </header>
      <section className="mx-auto grid max-w-7xl items-start gap-6 px-4 py-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
          <div className="aspect-[4/3] animate-pulse bg-slate-100" />
          <div className="flex gap-2 border-t border-slate-100 p-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-16 w-16 rounded-[8px] bg-slate-100" />
            ))}
          </div>
        </div>
        <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,118,110,0.06)]">
          <div className="h-4 w-28 animate-pulse rounded bg-cyan-100" />
          <div className="mt-3 h-9 w-4/5 animate-pulse rounded bg-slate-100" />
          <div className="mt-4 flex gap-2">
            <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100" />
            <div className="h-7 w-20 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div className="mt-5 h-24 animate-pulse rounded-[8px] bg-slate-100" />
          <div className="mt-5 h-12 animate-pulse rounded-[8px] bg-rose-100" />
          <div className="mt-3 h-11 animate-pulse rounded-[8px] bg-slate-100" />
        </div>
      </section>
    </main>
  );
}

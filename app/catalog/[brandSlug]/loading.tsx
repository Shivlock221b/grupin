export default function CatalogBrandLoading() {
  return (
    <main className="min-h-screen bg-[#f3faf7] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <div className="h-7 w-20 rounded-[8px] bg-emerald-100" />
          <div className="h-11 flex-1 rounded-[8px] bg-slate-100" />
          <div className="h-10 w-10 rounded-full bg-slate-100" />
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-4 py-5">
        <div className="h-[420px] animate-pulse rounded-[8px] bg-white shadow-[0_24px_80px_rgba(8,47,73,0.08)] sm:h-[470px]" />
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="mb-4 h-10 w-56 animate-pulse rounded-[8px] bg-white" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
              <div className="aspect-[4/3] animate-pulse bg-slate-100" />
              <div className="space-y-3 p-4">
                <div className="h-5 w-4/5 animate-pulse rounded bg-slate-100" />
                <div className="h-5 w-2/3 animate-pulse rounded bg-slate-100" />
                <div className="h-20 animate-pulse rounded-[8px] bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

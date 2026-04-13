import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">Not Found</p>
      <h1 className="mt-4 text-5xl font-semibold tracking-tight text-[var(--forest)]">That deal isn’t here.</h1>
      <p className="mt-4 text-base leading-7 text-[rgba(22,38,32,0.72)]">
        The link may be outdated, or the deal might have been archived. Head back to the live deal pages.
      </p>
      <Link href="/deals" className="mt-8 inline-block rounded-full bg-[var(--forest)] px-6 py-3 text-sm font-semibold text-white">
        Browse deals
      </Link>
    </div>
  );
}

import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";

type SuccessPageProps = {
  searchParams: Promise<{
    deal?: string;
    price?: string;
  }>;
};

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const deal = params.deal ?? "Antinorm Combo";
  const unlockedPrice = Number(params.price ?? 1400);

  return (
    <main className="bg-[#f8faf8] px-4 py-16">
      <div className="mx-auto max-w-xl rounded-[8px] border border-slate-200 bg-white p-6 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">Your GruPin price is ready</h1>
        <p className="mt-3 text-slate-600">
          Your reservation for {deal} is confirmed. Complete purchase on brand site at the unlocked price.
        </p>

        <div className="mt-6 rounded-[8px] bg-emerald-50 p-5">
          <p className="text-sm font-medium text-emerald-700">Unlocked price</p>
          <p className="mt-1 text-4xl font-semibold text-emerald-950">{formatPrice(unlockedPrice)}</p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href="https://antinorm.co"
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[8px] bg-emerald-600 px-5 py-3 text-center text-sm font-semibold leading-5 text-white transition hover:bg-emerald-700"
          >
            <span className="text-white">Complete purchase on brand site</span>
            <ExternalLink className="h-4 w-4 shrink-0 text-white" />
          </a>
          <Link
            href="/"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-[8px] border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold leading-5 text-slate-950 transition hover:bg-slate-50"
          >
            <span className="text-slate-950">Back to GruPin</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PoolCartClient } from "@/components/pool-cart-client";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { listProductPoolCartItems } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const profile = await getCurrentAccountProfile();

  if (!profile) {
    redirect("/login?next=/cart");
  }

  const cartItems = await listProductPoolCartItems(profile.id);

  return (
    <main className="min-h-screen bg-[#f8faf8] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950">
              <ArrowLeft className="h-4 w-4" />
              Back to homepage
            </Link>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700">Your cart</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">Tracked products</h1>
            <p className="mt-2 text-slate-600">See what you added and how many other carts contain the same products.</p>
          </div>
          <Link href="/" className="inline-flex h-11 items-center justify-center rounded-[10px] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-950">
            Add more products
          </Link>
        </div>

        <PoolCartClient cartItems={cartItems} />
      </div>
    </main>
  );
}

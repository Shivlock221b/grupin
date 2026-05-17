import { ReactNode } from "react";
import Link from "next/link";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="min-h-screen bg-[var(--sand)] text-[var(--ink)]">
      <main>{children}</main>
      <footer className="border-t border-slate-200 bg-white px-4 py-8 text-sm text-slate-600">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/unlock-deals" className="text-lg font-semibold text-emerald-950">GruPin</Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/faqs" className="hover:text-slate-950">FAQs</Link>
            <Link href="/contact-us" className="hover:text-slate-950">Contact us</Link>
            <Link href="/feedback" className="hover:text-slate-950">Feedback</Link>
            <Link href="/terms-and-conditions" className="hover:text-slate-950">Terms & Conditions</Link>
            <Link href="/privacy-policy" className="hover:text-slate-950">Privacy Policy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

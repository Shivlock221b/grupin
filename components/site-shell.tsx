import Link from "next/link";
import { ReactNode } from "react";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="min-h-screen bg-[var(--sand)] text-[var(--ink)]">
      <header className="border-b border-[rgba(22,38,32,0.12)] bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-[0.18em] text-[var(--forest)] uppercase">
            GruPin
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

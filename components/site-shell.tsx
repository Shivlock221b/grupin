import { ReactNode } from "react";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="min-h-screen bg-[var(--sand)] text-[var(--ink)]">
      <main>{children}</main>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Ticket, User, UserCircle } from "lucide-react";
import { AccountProfile } from "@/lib/types";

export function AccountMenu() {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const response = await fetch("/api/account/profile", { cache: "no-store" });

      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      setProfile(payload.profile ?? null);
    }

    void loadProfile();
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function logout() {
    await fetch("/api/account/logout", { method: "POST" });
    setProfile(null);
    setOpen(false);
    window.location.href = "/unlock-deals";
  }

  if (!profile) {
    return (
      <Link
        href="/login"
        aria-label="Login"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-800 transition hover:bg-slate-50"
      >
        <UserCircle className="h-5 w-5" />
      </Link>
    );
  }

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Account menu"
        className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-slate-950 text-white transition hover:bg-slate-800"
      >
        <UserCircle className="h-5 w-5" />
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-[8px] border border-slate-200 bg-white text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
          <div className="border-b border-slate-100 p-4">
            <p className="truncate text-sm font-semibold">{profile.fullName}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{profile.phone}</p>
          </div>
          <Link href="/account/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold transition hover:bg-slate-50">
            <User className="h-4 w-4" />
            Account details
          </Link>
          <Link href="/account/coupons" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold transition hover:bg-slate-50">
            <Ticket className="h-4 w-4" />
            Unlocked coupons
          </Link>
          <button onClick={logout} className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

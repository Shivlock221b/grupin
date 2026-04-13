import { signOutAdminAction } from "@/lib/actions";

export function AdminSignOutForm() {
  return (
    <form action={signOutAdminAction}>
      <button type="submit" className="rounded-full border border-[rgba(22,38,32,0.16)] px-4 py-2 text-sm font-semibold text-[var(--forest)]">
        Sign out
      </button>
    </form>
  );
}

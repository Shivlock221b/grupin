import { createClient } from "@/supabase/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getAdminPortalPath, hasAdminKeywordSession } from "@/lib/admin-keyword-auth";
import { getBrandMembershipsForEmail } from "@/lib/data";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  const supabase = await createClient();

  if (!supabase) {
    return {
      id: "profile-1",
      email: "aisha@example.com",
      app_metadata: {
        role: "admin",
      },
      isMockUser: true,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export function getAllowedAdminEmails() {
  return (process.env.ADMIN_EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdminEmail(email?: string | null) {
  const normalizedEmail = email?.toLowerCase() ?? "";
  return normalizedEmail ? getAllowedAdminEmails().includes(normalizedEmail) : false;
}

export async function isAdminUser(userId: string, email?: string | null) {
  if (isAllowedAdminEmail(email)) {
    return true;
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function requireAdmin() {
  const hasSession = await hasAdminKeywordSession();

  if (!hasSession) {
    throw new Error("Admin access required");
  }

  return {
    id: "keyword-admin",
    email: "admin@keyword.local",
    app_metadata: { role: "admin" },
    isKeywordAdmin: true,
  };
}

export async function requireAdminOrRedirect() {
  const hasSession = await hasAdminKeywordSession();

  if (!hasSession) {
    redirect(getAdminPortalPath());
  }

  return {
    id: "keyword-admin",
    email: "admin@keyword.local",
    app_metadata: { role: "admin" },
    isKeywordAdmin: true,
  };
}

export async function requireBrandPartnerOrRedirect() {
  const user = await getCurrentUser();

  if (!user?.email) {
    redirect("/admin/login");
  }

  if (isAllowedAdminEmail(user.email)) {
    const memberships = await getBrandMembershipsForEmail(user.email);

    if (memberships[0]) {
      return { user, membership: memberships[0], allMemberships: memberships, isPlatformAdmin: true };
    }
  }

  const memberships = await getBrandMembershipsForEmail(user.email);

  if (!memberships[0]) {
    redirect("/admin/login?error=not_authorized");
  }

  return { user, membership: memberships[0], allMemberships: memberships, isPlatformAdmin: false };
}

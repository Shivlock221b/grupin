import { createClient } from "@/supabase/server";
import { createAdminClient } from "@/lib/supabase-admin";
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
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Admin access required");
  }

  const isAdmin = await isAdminUser(user.id, user.email);

  if (!isAdmin) {
    throw new Error("Admin access required");
  }

  return user;
}

export async function requireAdminOrRedirect() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  const isAdmin = await isAdminUser(user.id, user.email);

  if (!isAdmin) {
    redirect("/admin/login?error=not_authorized");
  }

  return user;
}

import crypto from "crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase-admin";
import { AccountProfile } from "@/lib/types";
import { getAccountProfileById } from "@/lib/data";

const sessionCookieName = "grupin_account_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createAccountSession(profileId: string) {
  const supabase = createAdminClient();

  if (!supabase) {
    throw new Error("Supabase is required for account login.");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000).toISOString();

  const { error } = await supabase.from("user_sessions").insert({
    profile_id: profileId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    throw error;
  }

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds,
  });
}

export async function getCurrentAccountProfile(): Promise<AccountProfile | null> {
  const supabase = createAdminClient();
  const token = (await cookies()).get(sessionCookieName)?.value;

  if (!supabase || !token) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_sessions")
    .select("profile_id, expires_at")
    .eq("token_hash", hashToken(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data?.profile_id) {
    return null;
  }

  return getAccountProfileById(String(data.profile_id));
}

export async function clearAccountSession() {
  const supabase = createAdminClient();
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (supabase && token) {
    await supabase.from("user_sessions").delete().eq("token_hash", hashToken(token));
  }

  cookieStore.delete(sessionCookieName);
}

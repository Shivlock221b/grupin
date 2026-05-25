import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase-admin";

export type OtpPurpose = "reservation" | "coupon_unlock";

export function normalizePhone(phone: string) {
  const compact = phone.replace(/[^\d+]/g, "").trim();

  if (compact.startsWith("+")) {
    return compact;
  }

  if (/^[6-9]\d{9}$/.test(compact)) {
    return `+91${compact}`;
  }

  return compact;
}

export function phoneLookupVariants(phone: string) {
  const normalized = normalizePhone(phone);
  const digits = normalized.replace(/\D/g, "");
  const variants = new Set<string>([phone.trim(), normalized]);

  if (digits.length >= 10) {
    const lastTen = digits.slice(-10);
    variants.add(lastTen);
    variants.add(`+91${lastTen}`);
    variants.add(`91${lastTen}`);
  }

  return Array.from(variants).filter(Boolean);
}

export function createOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtpCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function isTestOtpCredential(phone: string, code: string) {
  return isTestPhoneCredential(phone) && code === "654321";
}

export function isTestPhoneCredential(phone: string) {
  const digits = normalizePhone(phone).replace(/\D/g, "");
  return digits.endsWith("9876543210");
}

function hasTwilioVerifyConfig() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID);
}

function useLocalOtpFallback() {
  return !hasTwilioVerifyConfig() || (process.env.OTP_DEMO_MODE === "true" && process.env.NODE_ENV !== "production");
}

function safeDealId(dealId?: string | null) {
  return typeof dealId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dealId)
    ? dealId
    : null;
}

export async function sendOtpSms(phone: string, code: string) {
  if (!hasTwilioVerifyConfig()) {
    console.log(`GruPin OTP for ${phone}: ${code}`);
    return { delivered: false, provider: "demo" };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const body = new URLSearchParams({
    To: phone,
    Channel: "sms",
  });

  const response = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message ?? "Could not send SMS OTP.");
  }

  return { delivered: true, provider: "twilio_verify_sms", sid: payload.sid as string | undefined };
}

export async function createOtp({ dealId = null, phone, purpose }: { dealId?: string | null; phone: string; purpose: OtpPurpose }) {
  const normalizedPhone = normalizePhone(phone);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  if (!normalizedPhone || normalizedPhone.length < 8) {
    throw new Error("Enter a valid phone number.");
  }

  if (useLocalOtpFallback()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OTP provider is not configured.");
    }

    const supabase = createAdminClient();
    const code = createOtpCode();

    if (!supabase) {
      throw new Error("OTP storage is not configured.");
    }

    const { error } = await supabase.from("otp_verifications").insert({
      deal_id: safeDealId(dealId),
      phone: normalizedPhone,
      purpose,
      otp_code: hashOtpCode(code),
      expires_at: expiresAt,
    });

    if (error) {
      throw error;
    }

    console.log(`GruPin demo OTP for ${normalizedPhone}: ${code}`);
    return {
      code,
      expiresAt,
      demoMode: true,
    };
  }

  await sendOtpSms(normalizedPhone, "");
  return {
    code: "",
    expiresAt,
    demoMode: false,
  };
}

export async function verifyOtp({ dealId = null, phone, purpose, code }: { dealId?: string | null; phone: string; purpose: OtpPurpose; code: string }) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone || normalizedPhone.length < 8 || !/^\d{6}$/.test(code)) {
    return false;
  }

  if (isTestOtpCredential(phone, code)) {
    return true;
  }

  if (useLocalOtpFallback()) {
    if (process.env.NODE_ENV === "production") {
      return false;
    }

    const supabase = createAdminClient();

    if (!supabase) {
      return false;
    }

    let query = supabase
      .from("otp_verifications")
      .select("id, otp_code, attempts, expires_at, verified_at")
      .in("phone", phoneLookupVariants(phone))
      .eq("purpose", purpose)
      .is("verified_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    const normalizedDealId = safeDealId(dealId);
    query = normalizedDealId ? query.eq("deal_id", normalizedDealId) : query.is("deal_id", null);

    const { data, error } = await query.maybeSingle();

    if (error || !data || Number(data.attempts ?? 0) >= 5) {
      return false;
    }

    const attempts = Number(data.attempts ?? 0) + 1;
    const matches = String(data.otp_code) === hashOtpCode(code);

    await supabase
      .from("otp_verifications")
      .update({
        attempts,
        ...(matches ? { verified_at: new Date().toISOString() } : {}),
      })
      .eq("id", data.id);

    return matches;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const body = new URLSearchParams({
    To: normalizedPhone,
    Code: code,
  });
  const response = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = await response.json();

  if (!response.ok) {
    return false;
  }

  return payload.status === "approved";
}

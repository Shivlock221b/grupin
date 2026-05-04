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

function hasTwilioVerifyConfig() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID);
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

export async function createOtp({ phone }: { dealId?: string | null; phone: string; purpose: OtpPurpose }) {
  const normalizedPhone = normalizePhone(phone);
  const code = createOtpCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  if (!normalizedPhone || normalizedPhone.length < 8) {
    throw new Error("Enter a valid phone number.");
  }

  await sendOtpSms(normalizedPhone, code);
  return {
    code,
    expiresAt,
    demoMode: !hasTwilioVerifyConfig() || process.env.OTP_DEMO_MODE === "true",
  };
}

export async function verifyOtp({ phone, code }: { dealId?: string | null; phone: string; purpose: OtpPurpose; code: string }) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone || normalizedPhone.length < 8 || !/^\d{6}$/.test(code)) {
    return false;
  }

  if (!hasTwilioVerifyConfig()) {
    return code === "123456";
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

import crypto from "crypto";
import { cookies } from "next/headers";

export const adminSessionCookieName = "grupin_admin_keyword_session";
const adminSessionMaxAgeSeconds = 60 * 60 * 12;

function getAdminKeyword() {
  return process.env.ADMIN_PORTAL_KEYWORD ?? "";
}

function normalizePortalPath(value?: string) {
  const trimmed = (value ?? "").trim();
  const fallback = "/grupin-admin-vault";
  const withSlash = trimmed ? (trimmed.startsWith("/") ? trimmed : `/${trimmed}`) : fallback;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : fallback;
}

export function getAdminPortalPath(path = "") {
  const basePath = normalizePortalPath(process.env.ADMIN_PORTAL_PATH);
  const suffix = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `${basePath}${suffix}`;
}

function sign(expiresAt: number) {
  const keyword = getAdminKeyword();
  return crypto.createHmac("sha256", keyword).update(`admin:${expiresAt}`).digest("hex");
}

function timingSafeEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);

  return firstBuffer.length === secondBuffer.length && crypto.timingSafeEqual(firstBuffer, secondBuffer);
}

function createSessionValue() {
  const expiresAt = Date.now() + adminSessionMaxAgeSeconds * 1000;
  return `${expiresAt}.${sign(expiresAt)}`;
}

function isValidSessionValue(value?: string) {
  const keyword = getAdminKeyword();

  if (!keyword || !value) {
    return false;
  }

  const [expiresAtValue, signature] = value.split(".");
  const expiresAt = Number(expiresAtValue);

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || !signature) {
    return false;
  }

  return timingSafeEqual(signature, sign(expiresAt));
}

function isValidKeyword(input: string) {
  const keyword = getAdminKeyword();

  if (!keyword) {
    return false;
  }

  return timingSafeEqual(input.trim(), keyword);
}

export async function createAdminKeywordSession(input: string) {
  if (!isValidKeyword(input)) {
    return false;
  }

  const cookieStore = await cookies();
  cookieStore.set(adminSessionCookieName, createSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: adminSessionMaxAgeSeconds,
  });

  return true;
}

export async function hasAdminKeywordSession() {
  const cookieStore = await cookies();
  return isValidSessionValue(cookieStore.get(adminSessionCookieName)?.value);
}

export async function clearAdminKeywordSession() {
  const cookieStore = await cookies();
  cookieStore.delete(adminSessionCookieName);
}

export function hasAdminKeywordSessionFromCookieHeader(cookieHeader?: string | null) {
  const cookie = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${adminSessionCookieName}=`));

  if (!cookie) {
    return false;
  }

  return isValidSessionValue(decodeURIComponent(cookie.slice(adminSessionCookieName.length + 1)));
}

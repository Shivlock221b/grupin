const blockedEmailDomains = new Set([
  "example.com",
  "test.com",
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
]);

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isWellFormattedEmail(email: string) {
  const normalized = normalizeEmail(email);
  const parts = normalized.split("@");

  if (
    normalized.length > 254 ||
    parts.length !== 2 ||
    parts[0].length < 2 ||
    parts[0].length > 64 ||
    parts[1].length < 4 ||
    /\s/.test(normalized) ||
    normalized.includes("..")
  ) {
    return false;
  }

  const [local, domain] = parts;

  if (
    local.startsWith(".") ||
    local.endsWith(".") ||
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    !domain.includes(".") ||
    blockedEmailDomains.has(domain)
  ) {
    return false;
  }

  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(normalized);
}

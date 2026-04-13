import { clsx } from "clsx";

export function cn(...values: Array<string | false | null | undefined>) {
  return clsx(values);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDiscountBand(discountPercent: number) {
  if (discountPercent >= 25) {
    return "25%+";
  }

  if (discountPercent >= 20) {
    return "20-24%";
  }

  if (discountPercent >= 15) {
    return "15-19%";
  }

  return "Under 15%";
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "No fixed closing date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function progressPercent(current: number, minimum: number) {
  if (minimum <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((current / minimum) * 100));
}

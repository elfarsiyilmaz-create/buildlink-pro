import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Two-letter initials from a display name (first + last word, or first two chars). */
export function initialsFromFullName(name: string | null | undefined): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "ZZ";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] || "";
    const b = parts[parts.length - 1][0] || "";
    const out = (a + b).toUpperCase();
    return out || "ZZ";
  }
  return trimmed.slice(0, 2).toUpperCase() || "ZZ";
}

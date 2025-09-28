// src/lib/utils.ts

// Merge className strings safely (minimal version used by shadcn/ui)
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const keyOf = (s: string) => s.trim().toLowerCase();

export function capitalize(s: string) {
  return s.replace(/\b\w/g, (m) => m.toUpperCase());
}
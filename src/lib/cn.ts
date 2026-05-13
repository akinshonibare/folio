import { twMerge } from "tailwind-merge";

/**
 * Class merge — twMerge resolves Tailwind conflicts so callers can override
 * earlier classes (e.g. cn("px-3", maybe && "px-5") yields "px-5").
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return twMerge(parts.filter(Boolean).join(" "));
}

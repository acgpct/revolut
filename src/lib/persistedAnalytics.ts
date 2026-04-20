import type { Analytics } from "@/lib/types";

/** Keeps dashboard and `/report` on the same payload after an in-browser upload (bundled `public/analytics.json` otherwise). */
const STORAGE_KEY = "fc-analytics-custom-json";

export function readPersistedAnalytics(): Analytics | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Analytics;
  } catch {
    return null;
  }
}

export function writePersistedAnalytics(data: Analytics): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota or private mode — ignore */
  }
}

export function clearPersistedAnalytics(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

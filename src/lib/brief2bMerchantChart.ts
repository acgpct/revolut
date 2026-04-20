import type { MerchantCountryMixRow } from "./types";

/** One row for Table + grouped bar chart (Brief 2B merchant country mix). */
export interface Brief2bMerchantMixRow {
  country: string;
  /** Short tick label (e.g. N/A for unknown). */
  label: string;
  fraudPct: number;
  fraudN: number;
  legitPct: number;
  legitN: number;
}

/**
 * Merge `kyc_fraud_merchant_top` and `kyc_legit_merchant_top` by country, sort by max share, take top N.
 */
export function buildBrief2bMerchantMixRows(
  fraudTop: MerchantCountryMixRow[] | undefined,
  legitTop: MerchantCountryMixRow[] | undefined,
  maxRows = 12
): Brief2bMerchantMixRow[] {
  const fm = new Map((fraudTop ?? []).map((r) => [r.country, r]));
  const lm = new Map((legitTop ?? []).map((r) => [r.country, r]));
  const keys = new Set([...fm.keys(), ...lm.keys()]);
  return [...keys]
    .map((country) => {
      const fr = fm.get(country);
      const lg = lm.get(country);
      return {
        country,
        label: country === "Unknown / Null" ? "N/A" : country,
        fraudPct: fr?.pct ?? 0,
        fraudN: fr?.txns ?? 0,
        legitPct: lg?.pct ?? 0,
        legitN: lg?.txns ?? 0,
      };
    })
    .sort((a, b) => Math.max(b.fraudPct, b.legitPct) - Math.max(a.fraudPct, a.legitPct))
    .slice(0, maxRows);
}

/** Recharts rows: two series as % of each cohort’s transactions. */
export function merchantMixToChartData(rows: Brief2bMerchantMixRow[]) {
  return rows.map((r) => ({
    label: r.label,
    country: r.country,
    fraudsters: r.fraudPct,
    legitimate: r.legitPct,
  }));
}

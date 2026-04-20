import fxSnapshotJson from "./fx-gbp-rates-snapshot.json";

/** Cryptocurrencies in the extract — excluded from FX-converted GBP sums (no reliable fiat cross here). */
export const CRYPTO_CURRENCIES = new Set<string>(["BTC", "ETH", "LTC", "XRP"]);

type FxApiPayload = {
  base_code: string;
  rates: Record<string, number>;
  time_last_update_utc: string;
};

export function loadFxSnapshot(): { rates: Record<string, number>; asOfUtc: string } {
  const s = fxSnapshotJson as FxApiPayload;
  return { rates: s.rates, asOfUtc: s.time_last_update_utc };
}

/**
 * `rates[c]` = units of `c` per **1 GBP** (open.er-api / GBP base).
 * So: `gbp = amount_in_c / rates[c]`.
 */
export function amountToGbp(amount: number, currency: string, rates: Record<string, number>): number | null {
  const c = (currency || "").trim().toUpperCase();
  if (!c) return null;
  if (CRYPTO_CURRENCIES.has(c)) return null;
  const r = rates[c];
  if (r == null || r === 0) return null;
  return amount / r;
}

/** Sum of `amountToGbp` over rows where conversion succeeds (fiat GBP, ex crypto). */
export function sumAmountGbpFiat(
  rows: { amount: number; currency: string }[],
  rates: Record<string, number>,
): { sumGbp: number; convertibleRows: number } {
  let sumGbp = 0;
  let convertibleRows = 0;
  for (const row of rows) {
    const gbp = amountToGbp(row.amount, row.currency, rates);
    if (gbp == null) continue;
    sumGbp += gbp;
    convertibleRows++;
  }
  return { sumGbp, convertibleRows };
}

export function aggregateFiatGbp(
  rows: { amount: number; currency: string; is_fraud: boolean }[],
  rates: Record<string, number>,
): {
  totalAmountGbp: number;
  fraudAmountGbp: number;
  fiatTxnRows: number;
  cryptoTxnRows: number;
  unknownCurrencyTxnRows: number;
} {
  let totalAmountGbp = 0;
  let fraudAmountGbp = 0;
  let fiatTxnRows = 0;
  let cryptoTxnRows = 0;
  let unknownCurrencyTxnRows = 0;

  for (const row of rows) {
    const c = (row.currency || "").trim().toUpperCase();
    if (!c) {
      unknownCurrencyTxnRows++;
      continue;
    }
    if (CRYPTO_CURRENCIES.has(c)) {
      cryptoTxnRows++;
      continue;
    }
    const gbp = amountToGbp(row.amount, c, rates);
    if (gbp == null) {
      unknownCurrencyTxnRows++;
      continue;
    }
    totalAmountGbp += gbp;
    fiatTxnRows++;
    if (row.is_fraud) fraudAmountGbp += gbp;
  }

  return {
    totalAmountGbp,
    fraudAmountGbp,
    fiatTxnRows,
    cryptoTxnRows,
    unknownCurrencyTxnRows,
  };
}

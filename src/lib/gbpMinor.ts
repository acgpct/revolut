/**
 * Format naive mixed-currency `AMOUNT` aggregates **without** a currency symbol.
 * Use for `overview.total_amount` / `overview.fraud_amount`, geo `fraud_amount`, fraudster `amount`, and similar raw sums.
 */
export function fmtRawAmountMajor(n: number): string {
  const x = Math.round(n);
  if (x >= 1_000_000_000) return `${(x / 1_000_000_000).toFixed(1)}B`;
  if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
  if (x >= 1_000) return `${(x / 1_000).toFixed(0)}K`;
  return `${x}`;
}

/**
 * Same as {@link fmtRawAmountMajor} — legacy name from when raw sums were formatted with a £ prefix.
 * Raw `AMOUNT` fields are mixed-currency; do not imply GBP.
 */
export function fmtGbpFromAmount(n: number): string {
  return fmtRawAmountMajor(n);
}

/**
 * Fiat GBP major units after FX conversion (e.g. `*_gbp_fiat`) — display with £.
 */
export function fmtFiatGbpMajor(n: number): string {
  const x = Math.round(n);
  if (x >= 1_000_000_000) return `£${(x / 1_000_000_000).toFixed(1)}B`;
  if (x >= 1_000_000) return `£${(x / 1_000_000).toFixed(1)}M`;
  if (x >= 1_000) return `£${(x / 1_000).toFixed(0)}K`;
  return `£${x}`;
}

/**
 * Format values stored in **pence** (true minor units). Prefer {@link fmtRawAmountMajor} for `overview` / fraudster raw sums.
 */
export function fmtGbpFromMinor(minor: number): string {
  const gbp = minor / 100;
  if (gbp >= 1_000_000) return `£${(gbp / 1_000_000).toFixed(2)}M`;
  if (gbp >= 1_000) return `£${(gbp / 1_000).toFixed(1)}K`;
  return `£${gbp.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

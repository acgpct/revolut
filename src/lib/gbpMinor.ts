/**
 * Format raw `AMOUNT` aggregates (same integer scale as `overview.fraud_amount`, `brief2a.*_amount`, fraudster `amount`).
 * Uses the same K/M/B rules as the printable report’s `fmtM` — **no ÷100** (values are whole GBP, not pence).
 */
export function fmtGbpFromAmount(n: number): string {
  const x = Math.round(n);
  if (x >= 1_000_000_000) return `£${(x / 1_000_000_000).toFixed(1)}B`;
  if (x >= 1_000_000) return `£${(x / 1_000_000).toFixed(1)}M`;
  if (x >= 1_000) return `£${(x / 1_000).toFixed(0)}K`;
  return `£${x}`;
}

/**
 * Format values stored in **pence** (true minor units). Prefer {@link fmtGbpFromAmount} for `overview` / fraudster sums.
 */
export function fmtGbpFromMinor(minor: number): string {
  const gbp = minor / 100;
  if (gbp >= 1_000_000) return `£${(gbp / 1_000_000).toFixed(2)}M`;
  if (gbp >= 1_000) return `£${(gbp / 1_000).toFixed(1)}K`;
  return `£${gbp.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

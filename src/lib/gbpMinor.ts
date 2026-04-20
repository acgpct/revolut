/** `AMOUNT` in the source extract is in minor units (e.g. pence). Display as GBP. */
export function fmtGbpFromMinor(minor: number): string {
  const gbp = minor / 100;
  if (gbp >= 1_000_000) return `£${(gbp / 1_000_000).toFixed(2)}M`;
  if (gbp >= 1_000) return `£${(gbp / 1_000).toFixed(1)}K`;
  return `£${gbp.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

import type { Brief1 } from "./types";

/** Headcount aligned with the PDF/report: registered users who are not yet true-conversion (KYC-passed + ≥1 legitimate card payment). */
export function notTrueConvertedUserCount(b: Brief1): number {
  if (typeof b.not_true_converted_users === "number") return b.not_true_converted_users;
  return b.unique_users - b.revolut_converted_users;
}

/**
 * Users by which marketing’s headline % overstates true conversion when the headline is read as “share of registered users”
 * (implied headcount ceil(registered × marketing_rate/100) − KYC-passed + legit card).
 */
export function ghostUsersVsMarketingClaim(b: Brief1): number {
  if (typeof b.ghost_users_vs_marketing_claim === "number") return b.ghost_users_vs_marketing_claim;
  const implied = Math.ceil((b.unique_users * b.marketing_rate) / 100 - 1e-9);
  return Math.max(0, implied - b.revolut_converted_users);
}

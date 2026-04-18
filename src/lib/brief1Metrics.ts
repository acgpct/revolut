import type { Brief1 } from "./types";

/** Headcount aligned with the PDF/report: registered users who are not yet true-conversion (KYC-passed + ≥1 legitimate card payment). */
export function notTrueConvertedUserCount(b: Brief1): number {
  if (typeof b.not_true_converted_users === "number") return b.not_true_converted_users;
  return b.unique_users - b.revolut_converted_users;
}

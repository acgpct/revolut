import type { Brief2bReplicationMeta } from "./brief2bReplicationMeta";

export interface Overview {
  total_txns: number;
  total_fraud: number;
  fraud_rate: number;
  total_amount: number;
  fraud_amount: number;
  unique_users: number;
  fraud_amount_pct: number;
  /** Fiat rows only: `AMOUNT` converted to GBP using snapshot FX (`fx_rates_as_of_utc`); crypto excluded. */
  total_amount_gbp_fiat?: number;
  fraud_amount_gbp_fiat?: number;
  /** `fraud_amount_gbp_fiat / total_amount_gbp_fiat` when both present. */
  fraud_amount_pct_gbp_fiat?: number;
  /** UTC timestamp of embedded `fx-gbp-rates-snapshot.json` (open.er-api, GBP base). */
  fx_rates_as_of_utc?: string;
  txn_rows_fiat_in_gbp?: number;
  txn_rows_crypto_excluded?: number;
  txn_rows_unknown_currency?: number;
}

export interface TxnType {
  type: string;
  count: number;
  fraud: number;
}

export interface Brief1 {
  unique_users: number;
  kyc_attempted_users: number;
  kyc_passed_users: number;
  topup_users: number;
  card_users: number;
  /** Distinct users with ≥1 `CARD_PAYMENT` or `BANK_TRANSFER` (any label, incl. fraud). `marketing_rate` numerator. */
  card_or_bank_users: number;
  legit_card_users: number;
  strict_converted_users: number;
  /** Registered users who have not reached true conversion (KYC-passed + ≥1 legitimate card). Same as report/PDF “not converted” headcount. Omitted in older snapshots — derive as unique_users − revolut_converted_users. */
  not_true_converted_users?: number;
  // legacy / compat
  spending_users: number;
  converted_users: number;
  revolut_converted_users: number;
  marketing_rate: number;   // headline marketing-reach % (Brief 1 funnel: card_or_bank_users / unique_users)
  strict_rate: number;      // strict_converted / total_users  (65.6%)
  revolut_rate: number;     // alias for strict_rate
  /** ceil(registered × marketing_rate%) — implied “converted” headcount if the headline % were read against all registered users. */
  marketing_implied_users?: number;
  /** Users by which marketing’s headline overstates revenue-ready conversion vs true converted (implied − KYC-passed + legit card). */
  ghost_users_vs_marketing_claim?: number;
  txn_types: TxnType[];
}

export interface GeoRisk {
  country: string;
  total: number;
  fraud: number;
  rate: number;
  fraud_amount: number;
  total_amount: number;
}

/** Brief 2A: country-level geo plus global fraud-loss split by channel class (fraud rows only). */
export interface Brief2a {
  geo_risk: GeoRisk[];
  /** Same pipeline as `geo_risk` but on user `COUNTRY` (registered/jurisdictional lens). Omitted in older snapshots. */
  geo_risk_user_country?: GeoRisk[];
  /** Sum of `AMOUNT` on fraud rows with `TYPE` ∈ { CARD_PAYMENT, ATM } — merchant-present / cash-out; geographic controls primary. */
  fraud_amount_merchant_facing: number;
  /** Sum of `AMOUNT` on fraud rows with `TYPE` ∈ { TOPUP, P2P, BANK_TRANSFER } — on-platform rails; velocity / behavioural controls primary. */
  fraud_amount_platform: number;
  /** Fraud rows outside the five canonical types (omitted if zero). */
  fraud_amount_other_channels?: number;
}

/** Top merchant countries by transaction count for a cohort (all txns for those users). */
export interface MerchantCountryMixRow {
  country: string;
  txns: number;
  pct: number;
}

/** KYC-passed fraud actor segmentation from all-txn type mix (dominant rail). */
export interface KycFraudArchetypeRow {
  id: "topup_atm" | "bank_transfer" | "card_first" | "mixed";
  label: string;
  users: number;
  fraud_txns: number;
  pct_users?: number;
  pct_fraud_txns?: number;
}

/** Fraud-txn counts: rows = channel types, cols = merchant countries (Brief 2B heatmap). */
export interface Brief2bTypeMerchantHeatmap {
  row_labels: string[];
  col_labels: string[];
  /** `matrix[r][c]` = fraud-labelled txn count. */
  matrix: number[][];
}

export interface Brief2b {
  // User counts
  kyc_fraud_users: number;       // KYC-passed users who are fraudsters (260)
  kyc_legit_users: number;       // KYC-passed users who are legitimate (6,729)
  // Transaction counts
  fraud_count: number;           // fraud txns from kyc-fraud users
  legit_count: number;           // legit txns from kyc-legit users
  // Transaction type distributions
  fraud_type_pct: Record<string, number>;
  legit_type_pct: Record<string, number>;
  // Per-transaction averages
  fraud_avg_amount: number;
  legit_avg_amount: number;
  /** Median `AMOUNT` on fraud-labelled txns (KYC-fraud user cohort). */
  fraud_median_txn_amount?: number;
  /** Median `AMOUNT` on legit-labelled txns (KYC-legit user cohort). */
  legit_median_txn_amount?: number;
  // Per-user behavioural averages
  fraud_avg_txns_per_user: number;
  legit_avg_txns_per_user: number;
  /** Mean distinct non-empty `MERCHANT_COUNTRY` values per user (blank / null rows excluded). */
  fraud_avg_countries: number;
  /** Mean distinct non-empty `MERCHANT_COUNTRY` values per user (blank / null rows excluded). */
  legit_avg_countries: number;
  // Demographics
  fraud_avg_birth: number;
  legit_avg_birth: number;
  /** Median birth year (per user first-seen) — KYC-fraud cohort. */
  fraud_median_birth_year?: number;
  legit_median_birth_year?: number;
  /** Top N `MERCHANT_COUNTRY` by txn count for all txns from KYC-passed fraudster users. */
  kyc_fraud_merchant_top?: MerchantCountryMixRow[];
  /** Top N merchant countries for all txns from KYC-passed legitimate users. */
  kyc_legit_merchant_top?: MerchantCountryMixRow[];
  /** Exact sum of fraud `AMOUNT` on KYC-passed fraudster cohort (raw mixed-currency scale; not avg×count). */
  fraud_amount_kyc_passed_cohort?: number;
  /** Same cohort’s fraud rows summed in GBP via embedded FX (ex crypto) — **same basis** as `overview.fraud_amount_gbp_fiat` for REC 3 vs exec-summary comparability. */
  fraud_amount_kyc_passed_cohort_gbp_fiat?: number;
  /** Fraud-labelled cohort rows that contribute to `fraud_amount_kyc_passed_cohort_gbp_fiat` (crypto / unknown currency excluded). */
  fraud_txns_kyc_passed_cohort_fiat_gbp?: number;
  /** User with the largest count of fraud-labelled rows where row-level `KYC` is PENDING (concentration disclosure). */
  pending_fraud_outlier_user_id?: string;
  pending_fraud_txns_from_outlier?: number;
  pending_total_txns_from_outlier?: number;
  /** PENDING fraud rate recomputed after removing the outlier user’s PENDING rows. */
  pending_fraud_rate_ex_outlier?: number;

  /** Dominant-rail archetypes among KYC-passed fraud users (all-txn mix per user). */
  kyc_fraud_archetypes?: KycFraudArchetypeRow[];
  /** % of cohort fraud-labelled txns in early / mid / late tertiles of CSV row order (0 = first third of file). */
  kyc_fraud_row_order_tertile_fraud_share_pct?: [number, number, number];
  /** Median normalised row index (0–1) for cohort fraud- vs legit-labelled txns — interpret only if file order proxies time. */
  kyc_fraud_median_row_order_norm?: number;
  kyc_legit_median_row_order_norm?: number;
  /** Fraud-type × merchant-country heatmap (KYC fraud cohort, fraud-labelled rows only). */
  kyc_fraud_type_merchant_heatmap?: Brief2bTypeMerchantHeatmap;

  /** Exact replication rules for counterfactual + archetypes (`brief2b-replication-meta.json`). */
  replication?: Brief2bReplicationMeta;
  /** KYC-passed fraud users meeting ≥2 of REC 3 static thresholds on all-txn mix (ATM>25%, BT>15%, card<45%). */
  rec3_rule_flagged_users?: number;
  /** Fraud-labelled cohort txns from those users (upper bound “in rule scope”). */
  rec3_rule_scope_fraud_txns?: number;
  /** Same txns with successful fiat GBP conversion (subset of `fraud_txns_kyc_passed_cohort_fiat_gbp`). */
  rec3_rule_scope_fraud_txns_fiat_gbp?: number;
}

export interface Fraudster {
  id: string;
  full_id: string;
  txns: number;
    /** Sum of fraud-labelled `AMOUNT` for this user — **same naive mixed-currency scale** as `overview.fraud_amount` (not row-wise fiat GBP). Display with `fmtRawAmountMajor` / `fmtGbpFromAmount` (no currency symbol), not `fmtGbpFromMinor`. */
  amount: number;
  /** User’s fraud rows summed in GBP via embedded FX (ex crypto) — optional in older analytics.json. */
  amount_gbp_fiat?: number;
  types_used: number;
  countries_hit: number;
  kyc: string;
  type_breakdown: Record<string, number>;
  /**
   * Composite score 0–100 (1 d.p.), matching fin_crime_audit.pdf:
   * 0.35·value + 0.30·fraud_txns + 0.15·fraud_rate + 0.10·type_diversity + 0.10·country_diversity
   * (each dimension max-normalised 0–1 — divide by max across fraud actors, not min–max or z-score).
   */
  score: number;
  /** Per-dimension weighted contribution (w_*); summed with weights for composite score (omit in legacy snapshots). */
  w_value?: number;
  w_txns?: number;
  w_rate?: number;
  w_types?: number;
  w_geo?: number;
}

export interface FraudByType {
  type: string;
  total: number;
  fraud: number;
  rate: number;
  fraud_amount: number;
}

export interface Analytics {
  overview: Overview;
  brief1: Brief1;
  brief2a: Brief2a;
  brief2b: Brief2b;
  kyc_status: Record<string, number>;
  kyc_fraud_status: Record<string, number>;
  fraud_by_type: FraudByType[];
  bonus: {
    top_fraudsters: Fraudster[];
    /** Top 5 by raw fraud amount (naive Σ AMOUNT), naive ranking — optional in older analytics.json. */
    top_fraudsters_by_amount?: Fraudster[];
    total_fraudsters: number;
  };
}

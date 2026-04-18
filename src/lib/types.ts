export interface Overview {
  total_txns: number;
  total_fraud: number;
  fraud_rate: number;
  total_amount: number;
  fraud_amount: number;
  unique_users: number;
  fraud_amount_pct: number;
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
  legit_card_users: number;
  strict_converted_users: number;
  /** Registered users who have not reached true conversion (KYC-passed + ≥1 legitimate card). Same as report/PDF “not converted” headcount. Omitted in older snapshots — derive as unique_users − revolut_converted_users. */
  not_true_converted_users?: number;
  // legacy / compat
  spending_users: number;
  converted_users: number;
  revolut_converted_users: number;
  marketing_rate: number;   // card_users / kyc_attempted  (~79.2%)
  strict_rate: number;      // strict_converted / total_users  (65.6%)
  revolut_rate: number;     // alias for strict_rate
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
  // Per-user behavioural averages
  fraud_avg_txns_per_user: number;
  legit_avg_txns_per_user: number;
  fraud_avg_countries: number;
  legit_avg_countries: number;
  // Demographics
  fraud_avg_birth: number;
  legit_avg_birth: number;
}

export interface Fraudster {
  id: string;
  full_id: string;
  txns: number;
  amount: number;
  types_used: number;
  countries_hit: number;
  kyc: string;
  type_breakdown: Record<string, number>;
  score: number;
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
  brief2a: { geo_risk: GeoRisk[] };
  brief2b: Brief2b;
  kyc_status: Record<string, number>;
  kyc_fraud_status: Record<string, number>;
  fraud_by_type: FraudByType[];
  bonus: {
    top_fraudsters: Fraudster[];
    total_fraudsters: number;
  };
}

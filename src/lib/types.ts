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
  topup_users: number;
  spending_users: number;
  converted_users: number;
  strict_converted_users: number;
  kyc_passed_users: number;
  legit_card_users: number;
  revolut_converted_users: number;
  strict_rate: number;
  marketing_rate: number;
  revolut_rate: number;
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
  fraud_count: number;
  legit_count: number;
  fraud_type_pct: Record<string, number>;
  legit_type_pct: Record<string, number>;
  fraud_avg_amount: number;
  legit_avg_amount: number;
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

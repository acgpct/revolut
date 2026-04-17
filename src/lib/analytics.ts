import type { Analytics } from "./types";

export function computeAnalytics(rows: Record<string, string>[]): Analytics {
  const fraudRows = rows.filter((r) => r.IS_FRAUD === "True" || r.is_fraud === "True");
  const legitRows = rows.filter((r) => r.IS_FRAUD === "False" || r.is_fraud === "False");

  // Normalise column names
  const get = (r: Record<string, string>, ...keys: string[]) => {
    for (const k of keys) {
      if (r[k] !== undefined) return r[k];
      if (r[k.toLowerCase()] !== undefined) return r[k.toLowerCase()];
      if (r[k.toUpperCase()] !== undefined) return r[k.toUpperCase()];
    }
    return "";
  };

  const norm = rows.map((r) => ({
    user_id: get(r, "USER_ID", "user_id"),
    type: get(r, "TYPE", "type"),
    amount: parseFloat(get(r, "AMOUNT", "amount") || "0"),
    currency: get(r, "CURRENCY", "currency"),
    merchant_country: get(r, "MERCHANT_COUNTRY", "merchant_country"),
    kyc: get(r, "KYC", "kyc"),
    birth_year: parseInt(get(r, "BIRTH_YEAR", "birth_year") || "0"),
    country: get(r, "COUNTRY", "country"),
    is_fraud: get(r, "IS_FRAUD", "is_fraud") === "True",
  }));

  const fraudNorm = norm.filter((r) => r.is_fraud);
  const legitNorm = norm.filter((r) => !r.is_fraud);

  const totalAmount = norm.reduce((s, r) => s + r.amount, 0);
  const fraudAmount = fraudNorm.reduce((s, r) => s + r.amount, 0);
  const uniqueUsers = new Set(norm.map((r) => r.user_id)).size;

  // Brief 1
  const topupUsers = new Set(norm.filter((r) => r.type === "TOPUP").map((r) => r.user_id));
  const spendingTypes = new Set(["CARD_PAYMENT", "P2P", "ATM", "BANK_TRANSFER"]);
  const spendingUsers = new Set(norm.filter((r) => spendingTypes.has(r.type)).map((r) => r.user_id));
  // Marketing definition: any user who topped up AND spent (includes fraudsters)
  const convertedUsers = new Set([...topupUsers].filter((u) => spendingUsers.has(u)));

  // Revolut definition: KYC PASSED + ≥1 legitimate (non-fraud) CARD_PAYMENT
  // Note: dataset has no registration date, so the 30-day window condition cannot be applied.
  // The interchange-revenue condition is satisfied strictly by CARD_PAYMENT (not ATM/P2P/transfer).
  const kycPassedUsers = new Set(norm.filter((r) => r.kyc === "PASSED").map((r) => r.user_id));
  const legitCardPaymentUsers = new Set(legitNorm.filter((r) => r.type === "CARD_PAYMENT").map((r) => r.user_id));
  const revolutConvertedUsers = new Set([...kycPassedUsers].filter((u) => legitCardPaymentUsers.has(u)));

  // Legacy strict definition (TOPUP + spending, zero fraud history) — kept for comparison
  const fraudUserIds = new Set(norm.filter((r) => r.is_fraud).map((r) => r.user_id));
  const cleanTopupUsers = new Set(legitNorm.filter((r) => r.type === "TOPUP").map((r) => r.user_id));
  const cleanSpendingUsers = new Set(legitNorm.filter((r) => spendingTypes.has(r.type)).map((r) => r.user_id));
  const strictConvertedUsers = new Set(
    [...cleanTopupUsers].filter((u) => cleanSpendingUsers.has(u) && !fraudUserIds.has(u))
  );

  const txnTypeMap: Record<string, { count: number; fraud: number }> = {};
  for (const r of norm) {
    if (!txnTypeMap[r.type]) txnTypeMap[r.type] = { count: 0, fraud: 0 };
    txnTypeMap[r.type].count++;
    if (r.is_fraud) txnTypeMap[r.type].fraud++;
  }

  // Brief 2A
  const fraudByCountry: Record<string, number> = {};
  const totalByCountry: Record<string, number> = {};
  const amountByCountry: Record<string, number> = {};
  const fraudAmountByCountry: Record<string, number> = {};
  for (const r of norm) {
    totalByCountry[r.country] = (totalByCountry[r.country] || 0) + 1;
    amountByCountry[r.country] = (amountByCountry[r.country] || 0) + r.amount;
    if (r.is_fraud) {
      fraudByCountry[r.country] = (fraudByCountry[r.country] || 0) + 1;
      fraudAmountByCountry[r.country] = (fraudAmountByCountry[r.country] || 0) + r.amount;
    }
  }

  const geoRisk = Object.entries(totalByCountry)
    .filter(([, total]) => total >= 50)
    .map(([country, total]) => ({
      country,
      total,
      fraud: fraudByCountry[country] || 0,
      rate: Math.round(((fraudByCountry[country] || 0) / total) * 10000) / 100,
      fraud_amount: Math.round(fraudAmountByCountry[country] || 0),
      total_amount: Math.round(amountByCountry[country] || 0),
    }))
    .sort((a, b) => b.fraud - a.fraud)
    .slice(0, 20);

  // Brief 2B
  const kycPassedFraud = fraudNorm.filter((r) => r.kyc === "PASSED");
  const kycPassedLegit = legitNorm.filter((r) => r.kyc === "PASSED");

  const typePct = (data: typeof norm) => {
    const c: Record<string, number> = {};
    const total = data.length;
    for (const r of data) c[r.type] = (c[r.type] || 0) + 1;
    return Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.round((v / total) * 1000) / 10]));
  };

  const kycStatus: Record<string, number> = {};
  const kycFraudStatus: Record<string, number> = {};
  for (const r of norm) kycStatus[r.kyc] = (kycStatus[r.kyc] || 0) + 1;
  for (const r of fraudNorm) kycFraudStatus[r.kyc] = (kycFraudStatus[r.kyc] || 0) + 1;

  // Fraud by type
  const fraudByType = ["CARD_PAYMENT", "TOPUP", "ATM", "BANK_TRANSFER", "P2P"].map((typ) => {
    const typeRows = norm.filter((r) => r.type === typ);
    const typeFraud = typeRows.filter((r) => r.is_fraud);
    return {
      type: typ,
      total: typeRows.length,
      fraud: typeFraud.length,
      rate: typeRows.length ? Math.round((typeFraud.length / typeRows.length) * 10000) / 100 : 0,
      fraud_amount: Math.round(typeFraud.reduce((s, r) => s + r.amount, 0)),
    };
  });

  // Bonus: Top 5 Fraudsters
  const userFraud: Record<string, { txns: number; amount: number; types: Record<string, number>; countries: Set<string>; kyc: string }> = {};
  for (const r of fraudNorm) {
    if (!userFraud[r.user_id]) userFraud[r.user_id] = { txns: 0, amount: 0, types: {}, countries: new Set(), kyc: "" };
    userFraud[r.user_id].txns++;
    userFraud[r.user_id].amount += r.amount;
    userFraud[r.user_id].types[r.type] = (userFraud[r.user_id].types[r.type] || 0) + 1;
    userFraud[r.user_id].countries.add(r.merchant_country);
    userFraud[r.user_id].kyc = r.kyc;
  }

  const ranked = Object.entries(userFraud)
    .map(([uid, data]) => ({
      id: uid.slice(0, 8) + "...",
      full_id: uid,
      txns: data.txns,
      amount: Math.round(data.amount),
      types_used: Object.keys(data.types).length,
      countries_hit: data.countries.size,
      kyc: data.kyc,
      type_breakdown: data.types,
      score: Math.round((data.txns * 0.4 + (data.amount / 1000) * 0.3 + Object.keys(data.types).length * 5 + data.countries.size * 3) * 10) / 10,
    }))
    .sort((a, b) => b.score - a.score);

  return {
    overview: {
      total_txns: norm.length,
      total_fraud: fraudNorm.length,
      fraud_rate: Math.round((fraudNorm.length / norm.length) * 10000) / 100,
      total_amount: Math.round(totalAmount),
      fraud_amount: Math.round(fraudAmount),
      unique_users: uniqueUsers,
      fraud_amount_pct: Math.round((fraudAmount / totalAmount) * 10000) / 100,
    },
    brief1: {
      unique_users: uniqueUsers,
      topup_users: topupUsers.size,
      spending_users: spendingUsers.size,
      converted_users: convertedUsers.size,
      strict_converted_users: strictConvertedUsers.size,
      kyc_passed_users: kycPassedUsers.size,
      legit_card_users: legitCardPaymentUsers.size,
      revolut_converted_users: revolutConvertedUsers.size,
      // Marketing: topped up + spent (any user, including fraudsters) / all users ≈ 78%
      marketing_rate: Math.round((convertedUsers.size / uniqueUsers) * 10000) / 100,
      // Strict: topped up + spent with zero fraud history / all users
      strict_rate: Math.round((strictConvertedUsers.size / uniqueUsers) * 10000) / 100,
      // Revolut definition: KYC PASSED + ≥1 legitimate CARD_PAYMENT / all users
      revolut_rate: Math.round((revolutConvertedUsers.size / uniqueUsers) * 10000) / 100,
      txn_types: Object.entries(txnTypeMap).map(([type, d]) => ({ type, ...d })),
    },
    brief2a: { geo_risk: geoRisk },
    brief2b: {
      fraud_count: kycPassedFraud.length,
      legit_count: kycPassedLegit.length,
      fraud_type_pct: typePct(kycPassedFraud),
      legit_type_pct: typePct(kycPassedLegit),
      fraud_avg_amount: kycPassedFraud.length ? Math.round(kycPassedFraud.reduce((s, r) => s + r.amount, 0) / kycPassedFraud.length) : 0,
      legit_avg_amount: kycPassedLegit.length ? Math.round(kycPassedLegit.reduce((s, r) => s + r.amount, 0) / kycPassedLegit.length) : 0,
      fraud_avg_birth: kycPassedFraud.length ? Math.round(kycPassedFraud.reduce((s, r) => s + r.birth_year, 0) / kycPassedFraud.length) : 0,
      legit_avg_birth: kycPassedLegit.length ? Math.round(kycPassedLegit.reduce((s, r) => s + r.birth_year, 0) / kycPassedLegit.length) : 0,
    },
    kyc_status: kycStatus,
    kyc_fraud_status: kycFraudStatus,
    fraud_by_type: fraudByType,
    bonus: {
      top_fraudsters: ranked.slice(0, 5),
      total_fraudsters: ranked.length,
    },
  };
}

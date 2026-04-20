import type { Analytics, Brief2a, MerchantCountryMixRow } from "./types";

/* ─── helpers ──────────────────────────────────────────── */
const get = (r: Record<string, string>, key: string) =>
  r[key] ?? r[key.toLowerCase()] ?? r[key.toUpperCase()] ?? "";

const avg = (arr: number[]) =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const round2 = (n: number) => Math.round(n * 100) / 100;

const median = (values: number[]): number => {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
};

function topMerchantMixRows(txns: { merchant_country: string }[], topN: number): MerchantCountryMixRow[] {
  const m: Record<string, number> = {};
  for (const r of txns) {
    const c = r.merchant_country === "" ? "Unknown / Null" : r.merchant_country;
    m[c] = (m[c] || 0) + 1;
  }
  const tot = txns.length || 1;
  return Object.entries(m)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([country, count]) => ({ country, txns: count, pct: round2((count / tot) * 100) }));
}

/* ─── KYC priority ─────────────────────────────────────── */
const KYC_PRIORITY: Record<string, number> = { PASSED: 4, PENDING: 3, FAILED: 2, NONE: 1 };
const PRIORITY_TO_KYC: Record<number, string> = { 4: "PASSED", 3: "PENDING", 2: "FAILED", 1: "NONE" };

export function computeAnalytics(rows: Record<string, string>[]): Analytics {

  /* ── Normalise rows ─────────────────────────────────── */
  const norm = rows.map((r) => ({
    user_id:          get(r, "USER_ID"),
    type:             get(r, "TYPE"),
    amount:           parseFloat(get(r, "AMOUNT") || "0"),
    currency:         get(r, "CURRENCY"),
    merchant_country: get(r, "MERCHANT_COUNTRY"),
    kyc:              get(r, "KYC"),
    birth_year:       parseInt(get(r, "BIRTH_YEAR") || "0"),
    country:          get(r, "COUNTRY"),
    is_fraud:         get(r, "IS_FRAUD") === "True",
  }));

  const fraudNorm = norm.filter((r) => r.is_fraud);
  const legitNorm = norm.filter((r) => !r.is_fraud);

  /* ── Overview ───────────────────────────────────────── */
  const totalUsers   = new Set(norm.map((r) => r.user_id)).size;
  const totalTxns    = norm.length;
  const fraudTxns    = fraudNorm.length;
  const totalAmount  = norm.reduce((s, r) => s + r.amount, 0);
  const fraudAmount  = fraudNorm.reduce((s, r) => s + r.amount, 0);

  /* ── Step 1: KYC status per user (max-priority rule) ── */
  // Each user may have multiple rows with different KYC values.
  // Take the most advanced status per user.
  const userKycPriority: Record<string, number> = {};
  for (const r of norm) {
    const p = KYC_PRIORITY[r.kyc] ?? 0;
    userKycPriority[r.user_id] = Math.max(userKycPriority[r.user_id] ?? 0, p);
  }
  const userKycStatus: Record<string, string> = {};
  for (const [uid, p] of Object.entries(userKycPriority)) {
    userKycStatus[uid] = PRIORITY_TO_KYC[p] ?? "NONE";
  }

  /* ── Brief 1 — Conversion Rate ─────────────────────── */
  // Key user sets
  const kycAttemptedUsers = new Set(
    Object.entries(userKycStatus).filter(([, s]) => s !== "NONE").map(([u]) => u)
  );
  const kycPassedUsers = new Set(
    Object.entries(userKycStatus).filter(([, s]) => s === "PASSED").map(([u]) => u)
  );
  const topupUsers   = new Set(norm.filter((r) => r.type === "TOPUP").map((r) => r.user_id));
  const cardUsers    = new Set(norm.filter((r) => r.type === "CARD_PAYMENT").map((r) => r.user_id));

  // Marketing rate = card_users / kyc_attempted  (~79.2%)
  // Inflated: numerator includes fraud card payments; denominator is kyc-attempted, not all users
  const marketingRate = round2((cardUsers.size / (kycAttemptedUsers.size || 1)) * 100);

  // Strict rate = (KYC-passed ∩ legit-card-users) / total_users  (65.6%)
  const legitCardUsers = new Set(legitNorm.filter((r) => r.type === "CARD_PAYMENT").map((r) => r.user_id));
  const strictConverted = new Set([...kycPassedUsers].filter((u) => legitCardUsers.has(u)));
  const strictRate = round2((strictConverted.size / (totalUsers || 1)) * 100);
  const notTrueConvertedUsers = totalUsers - strictConverted.size;

  // Transaction-type map
  const txnTypeMap: Record<string, { count: number; fraud: number }> = {};
  for (const r of norm) {
    if (!txnTypeMap[r.type]) txnTypeMap[r.type] = { count: 0, fraud: 0 };
    txnTypeMap[r.type].count++;
    if (r.is_fraud) txnTypeMap[r.type].fraud++;
  }

  /* ── Brief 2A — Geographic Risk ────────────────────── */
  // Group by MERCHANT_COUNTRY, filter ≥ 50 transactions
  const geoMap: Record<string, { total: number; fraud: number; fraudAmt: number; totalAmt: number }> = {};
  for (const r of norm) {
    const c = r.merchant_country;
    if (!geoMap[c]) geoMap[c] = { total: 0, fraud: 0, fraudAmt: 0, totalAmt: 0 };
    geoMap[c].total++;
    geoMap[c].totalAmt += r.amount;
    if (r.is_fraud) {
      geoMap[c].fraud++;
      geoMap[c].fraudAmt += r.amount;
    }
  }

  const geoList = Object.entries(geoMap)
    .filter(([, g]) => g.total >= 50)
    .map(([country, g]) => ({
      country: country === "" ? "Unknown / Null" : country,
      total:        g.total,
      fraud:        g.fraud,
      rate:         round2((g.fraud / g.total) * 100),
      fraud_amount: Math.round(g.fraudAmt),
      total_amount: Math.round(g.totalAmt),
    }));

  // Sorted by fraud volume; full list kept so rate-chart can surface low-volume / high-rate countries (e.g. MDA)
  const byVolume = [...geoList].sort((a, b) => b.fraud - a.fraud);

  // Fraud loss split by channel class (fraud-labelled rows only; complements MERCHANT_COUNTRY geo view)
  let fraudAmtMerchantFacing = 0;
  let fraudAmtPlatform = 0;
  let fraudAmtOtherChannels = 0;
  for (const r of fraudNorm) {
    if (r.type === "CARD_PAYMENT" || r.type === "ATM") fraudAmtMerchantFacing += r.amount;
    else if (r.type === "TOPUP" || r.type === "P2P" || r.type === "BANK_TRANSFER") fraudAmtPlatform += r.amount;
    else fraudAmtOtherChannels += r.amount;
  }
  const brief2a: Brief2a = {
    geo_risk: byVolume,
    fraud_amount_merchant_facing: Math.round(fraudAmtMerchantFacing),
    fraud_amount_platform: Math.round(fraudAmtPlatform),
  };
  if (fraudAmtOtherChannels > 0.5) brief2a.fraud_amount_other_channels = Math.round(fraudAmtOtherChannels);

  /* ── Brief 2B — KYC-Passed Fraudsters ──────────────── */
  // fraudster_users = any user with ≥1 fraud transaction
  const fraudsterUsers = new Set(fraudNorm.map((r) => r.user_id));

  // kyc_fraud_users = intersection of kycPassedUsers ∩ fraudsterUsers
  const kycFraudUserIds  = new Set([...kycPassedUsers].filter((u) => fraudsterUsers.has(u)));
  const kycLegitUserIds  = new Set([...kycPassedUsers].filter((u) => !fraudsterUsers.has(u)));

  // Transactions belonging to each group
  const kycFraudTxns     = norm.filter((r) => kycFraudUserIds.has(r.user_id));
  const kycLegitTxns     = norm.filter((r) => kycLegitUserIds.has(r.user_id));
  const kycFraudFraudTxns = kycFraudTxns.filter((r) => r.is_fraud);   // fraud txns of kyc-fraud users
  const kycLegitLegitTxns = kycLegitTxns.filter((r) => !r.is_fraud);  // legit txns of kyc-legit users

  // Per-user aggregates for kyc fraud users
  const kycFraudPerUser: Record<string, { txns: number; countries: Set<string>; birth: number }> = {};
  for (const r of kycFraudTxns) {
    if (!kycFraudPerUser[r.user_id]) kycFraudPerUser[r.user_id] = { txns: 0, countries: new Set(), birth: r.birth_year };
    kycFraudPerUser[r.user_id].txns++;
    const mc = (r.merchant_country ?? "").trim();
    if (mc !== "") kycFraudPerUser[r.user_id].countries.add(mc);
  }
  const kycFraudUserList = Object.values(kycFraudPerUser);

  // Per-user aggregates for kyc legit users
  const kycLegitPerUser: Record<string, { txns: number; countries: Set<string>; birth: number }> = {};
  for (const r of kycLegitTxns) {
    if (!kycLegitPerUser[r.user_id]) kycLegitPerUser[r.user_id] = { txns: 0, countries: new Set(), birth: r.birth_year };
    kycLegitPerUser[r.user_id].txns++;
    const mc = (r.merchant_country ?? "").trim();
    if (mc !== "") kycLegitPerUser[r.user_id].countries.add(mc);
  }
  const kycLegitUserList = Object.values(kycLegitPerUser);

  const fraudMedTxnAmt = Math.round(median(kycFraudFraudTxns.map((r) => r.amount)));
  const legitMedTxnAmt = Math.round(median(kycLegitLegitTxns.map((r) => r.amount)));
  const fraudBirthYears = kycFraudUserList.map((u) => u.birth).filter((b) => b > 1900);
  const legitBirthYears = kycLegitUserList.map((u) => u.birth).filter((b) => b > 1900);
  const fraudMedBirth = fraudBirthYears.length ? Math.round(median(fraudBirthYears)) : 0;
  const legitMedBirth = legitBirthYears.length ? Math.round(median(legitBirthYears)) : 0;
  const kycFraudMerchantTop = topMerchantMixRows(kycFraudTxns, 8);
  const kycLegitMerchantTop = topMerchantMixRows(kycLegitTxns, 8);

  // Type % distribution
  const typePct = (txns: typeof norm) => {
    const total = txns.length || 1;
    const counts: Record<string, number> = {};
    for (const r of txns) counts[r.type] = (counts[r.type] || 0) + 1;
    return Object.fromEntries(
      Object.entries(counts).map(([k, v]) => [k, round2((v / total) * 100)])
    );
  };

  // KYC status counts (transaction-level, for the status breakdown panel)
  const kycStatusTxns: Record<string, number> = {};
  const kycFraudStatusTxns: Record<string, number> = {};
  for (const r of norm)      kycStatusTxns[r.kyc]      = (kycStatusTxns[r.kyc]      || 0) + 1;
  for (const r of fraudNorm) kycFraudStatusTxns[r.kyc] = (kycFraudStatusTxns[r.kyc] || 0) + 1;

  /* ── Fraud by type (all users) ──────────────────────── */
  const fraudByType = ["CARD_PAYMENT", "TOPUP", "ATM", "BANK_TRANSFER", "P2P"].map((typ) => {
    const all   = norm.filter((r) => r.type === typ);
    const fraud = all.filter((r) => r.is_fraud);
    return {
      type:         typ,
      total:        all.length,
      fraud:        fraud.length,
      rate:         all.length ? round2((fraud.length / all.length) * 100) : 0,
      fraud_amount: Math.round(fraud.reduce((s, r) => s + r.amount, 0)),
    };
  });

  /* ── Bonus — Top fraudsters (fin_crime_audit.pdf composite) ── */
  const userAllTxns: Record<string, number> = {};
  for (const r of norm) {
    userAllTxns[r.user_id] = (userAllTxns[r.user_id] || 0) + 1;
  }

  type UserFraudAgg = {
    txns: number;
    amount: number;
    avgAmount: number;
    types: Record<string, number>;
    countries: Set<string>;
    kyc: string;
  };
  const userFraud: Record<string, UserFraudAgg> = {};
  for (const r of fraudNorm) {
    if (!userFraud[r.user_id])
      userFraud[r.user_id] = { txns: 0, amount: 0, avgAmount: 0, types: {}, countries: new Set(), kyc: r.kyc };
    userFraud[r.user_id].txns++;
    userFraud[r.user_id].amount += r.amount;
    userFraud[r.user_id].types[r.type] = (userFraud[r.user_id].types[r.type] || 0) + 1;
    const mcF = (r.merchant_country ?? "").trim();
    if (mcF !== "") userFraud[r.user_id].countries.add(mcF);
    if ((KYC_PRIORITY[r.kyc] ?? 0) > (KYC_PRIORITY[userFraud[r.user_id].kyc] ?? 0))
      userFraud[r.user_id].kyc = r.kyc;
  }
  for (const u of Object.values(userFraud)) u.avgAmount = u.txns ? u.amount / u.txns : 0;

  const allFraudUsers = Object.values(userFraud);
  const maxAmount = Math.max(...allFraudUsers.map((u) => u.amount), 1);
  const maxTxns = Math.max(...allFraudUsers.map((u) => u.txns), 1);
  const maxGeo = Math.max(...allFraudUsers.map((u) => u.countries.size), 1);
  const maxTypesUsed = Math.max(...allFraudUsers.map((u) => Object.keys(u.types).length), 1);
  const maxFraudRate = Math.max(
    ...Object.entries(userFraud).map(([uid, u]) => u.txns / (userAllTxns[uid] || 1)),
    1e-9,
  );

  const fraudsterRow = (uid: string, u: UserFraudAgg) => {
    const types_used = Object.keys(u.types).length;
    const fraudRate = u.txns / (userAllTxns[uid] || 1);
    const v_n = u.amount / maxAmount;
    const t_n = u.txns / maxTxns;
    const r_n = fraudRate / maxFraudRate;
    const typ_n = types_used / maxTypesUsed;
    const g_n = u.countries.size / maxGeo;
    const w_value = 0.35 * v_n;
    const w_txns = 0.30 * t_n;
    const w_rate = 0.15 * r_n;
    const w_types = 0.10 * typ_n;
    const w_geo = 0.10 * g_n;
    const raw = w_value + w_txns + w_rate + w_types + w_geo;
    const score = Math.round(raw * 1000) / 10;
    return {
      id: uid.slice(0, 8) + "…",
      full_id: uid,
      txns: u.txns,
      amount: Math.round(u.amount),
      types_used,
      countries_hit: u.countries.size,
      kyc: userKycStatus[uid] ?? u.kyc,
      type_breakdown: u.types,
      score,
      w_value,
      w_txns,
      w_rate,
      w_types,
      w_geo,
    };
  };

  const ranked = Object.entries(userFraud)
    .map(([uid, u]) => fraudsterRow(uid, u))
    .sort((a, b) => b.score - a.score);

  const topFraudstersByAmount = [...ranked].sort((a, b) => b.amount - a.amount).slice(0, 5);

  /* ── Assemble ───────────────────────────────────────── */
  return {
    overview: {
      total_txns:       totalTxns,
      total_fraud:      fraudTxns,
      fraud_rate:       round2((fraudTxns / totalTxns) * 100),
      total_amount:     Math.round(totalAmount),
      fraud_amount:     Math.round(fraudAmount),
      unique_users:     totalUsers,
      fraud_amount_pct: round2((fraudAmount / totalAmount) * 100),
    },
    brief1: {
      unique_users:            totalUsers,
      kyc_attempted_users:     kycAttemptedUsers.size,
      kyc_passed_users:        kycPassedUsers.size,
      topup_users:             topupUsers.size,
      card_users:              cardUsers.size,
      legit_card_users:        legitCardUsers.size,
      strict_converted_users:  strictConverted.size,
      not_true_converted_users: notTrueConvertedUsers,
      // legacy fields kept for backwards compat
      spending_users:          0,
      converted_users:         0,
      revolut_converted_users: strictConverted.size,
      marketing_rate:          marketingRate,
      strict_rate:             strictRate,
      revolut_rate:            strictRate,
      txn_types: Object.entries(txnTypeMap).map(([type, d]) => ({ type, ...d })),
    },
    brief2a,
    brief2b: {
      kyc_fraud_users:        kycFraudUserIds.size,
      kyc_legit_users:        kycLegitUserIds.size,
      fraud_count:            kycFraudFraudTxns.length,
      legit_count:            kycLegitLegitTxns.length,
      fraud_type_pct:         typePct(kycFraudFraudTxns),
      legit_type_pct:         typePct(kycLegitLegitTxns),
      fraud_avg_amount:       kycFraudFraudTxns.length ? Math.round(avg(kycFraudFraudTxns.map((r) => r.amount))) : 0,
      legit_avg_amount:       kycLegitLegitTxns.length ? Math.round(avg(kycLegitLegitTxns.map((r) => r.amount))) : 0,
      fraud_median_txn_amount: fraudMedTxnAmt,
      legit_median_txn_amount: legitMedTxnAmt,
      fraud_avg_birth:        kycFraudUserList.length  ? Math.round(avg(kycFraudUserList.map((u) => u.birth)))   : 0,
      legit_avg_birth:        kycLegitUserList.length  ? Math.round(avg(kycLegitUserList.map((u) => u.birth)))   : 0,
      fraud_median_birth_year: fraudMedBirth,
      legit_median_birth_year: legitMedBirth,
      fraud_avg_txns_per_user: kycFraudUserList.length ? round2(avg(kycFraudUserList.map((u) => u.txns)))        : 0,
      legit_avg_txns_per_user: kycLegitUserList.length ? round2(avg(kycLegitUserList.map((u) => u.txns)))        : 0,
      fraud_avg_countries:    kycFraudUserList.length  ? round2(avg(kycFraudUserList.map((u) => u.countries.size))) : 0,
      legit_avg_countries:    kycLegitUserList.length  ? round2(avg(kycLegitUserList.map((u) => u.countries.size))) : 0,
      kyc_fraud_merchant_top: kycFraudMerchantTop,
      kyc_legit_merchant_top: kycLegitMerchantTop,
    },
    kyc_status:       kycStatusTxns,
    kyc_fraud_status: kycFraudStatusTxns,
    fraud_by_type:    fraudByType,
    bonus: {
      top_fraudsters: ranked.slice(0, 5),
      top_fraudsters_by_amount: topFraudstersByAmount,
      total_fraudsters: ranked.length,
    },
  };
}

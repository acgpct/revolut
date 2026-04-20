"use client";

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, Legend, CartesianGrid } from "recharts";
import {
  ChartTooltipFromPayload,
  ChartTooltipRoot,
  ChartTooltipTitle,
  ChartTooltipRows,
  ChartTooltipRow,
} from "@/components/ui/ChartTooltip";
import Panel from "@/components/ui/Panel";
import PageHeader from "@/components/ui/PageHeader";
import type { Brief2b, FraudByType } from "@/lib/types";
import { buildBrief2bMerchantMixRows, merchantMixToChartData } from "@/lib/brief2bMerchantChart";

const fmt  = (n: number) => n.toLocaleString();
const fmtM = (n: number) => {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `£${(n / 1_000).toFixed(0)}K`;
  return `£${n}`;
};

interface Props {
  data: Brief2b;
  fraudByType: FraudByType[];
  kycStatus: Record<string, number>;
  kycFraudStatus: Record<string, number>;
}

export default function KYCPage({ data, fraudByType, kycStatus, kycFraudStatus }: Props) {
  const fraudTop = data.kyc_fraud_merchant_top ?? [];
  const legitTop = data.kyc_legit_merchant_top ?? [];
  const merchantRows = buildBrief2bMerchantMixRows(fraudTop, legitTop, 12);
  const merchantChartData = merchantMixToChartData(merchantRows);
  const pendingTot = kycStatus.PENDING ?? 0;
  const pendingFraud = kycFraudStatus.PENDING ?? 0;
  const failedTot = kycStatus.FAILED ?? 0;
  const failedFraud = kycFraudStatus.FAILED ?? 0;
  const pendingFraudRate = pendingTot ? Math.round((pendingFraud / pendingTot) * 10000) / 100 : 0;
  const failedFraudRate = failedTot ? Math.round((failedFraud / failedTot) * 10000) / 100 : 0;

  const txnTypes = ["CARD_PAYMENT", "TOPUP", "ATM", "BANK_TRANSFER", "P2P"];
  const shortLabels: Record<string, string> = {
    CARD_PAYMENT: "Card", TOPUP: "Top-up", ATM: "ATM", BANK_TRANSFER: "Transfer", P2P: "P2P",
  };

  const radarData = txnTypes.map((t) => ({
    type: shortLabels[t],
    Fraud: data.fraud_type_pct[t] || 0,
    Legitimate: data.legit_type_pct[t] || 0,
  }));

  const rateBarData = fraudByType.map((t) => ({
    name: t.type.replace(/_/g, " "),
    rate: t.rate,
  }));

  const kycRows = [
    { status: "Passed",  total: kycStatus.PASSED  || 0, fraud: kycFraudStatus.PASSED  || 0 },
    { status: "Failed",  total: kycStatus.FAILED   || 0, fraud: kycFraudStatus.FAILED  || 0 },
    { status: "Pending", total: kycStatus.PENDING  || 0, fraud: kycFraudStatus.PENDING || 0 },
    { status: "None",    total: kycStatus.NONE     || 0, fraud: kycFraudStatus.NONE    || 0 },
  ];

  const signals = [
    { signal: "ATM Withdrawals", fraud: data.fraud_type_pct["ATM"] || 0,           legit: data.legit_type_pct["ATM"] || 0 },
    { signal: "Bank Transfers",  fraud: data.fraud_type_pct["BANK_TRANSFER"] || 0, legit: data.legit_type_pct["BANK_TRANSFER"] || 0 },
    { signal: "Top-ups",         fraud: data.fraud_type_pct["TOPUP"] || 0,         legit: data.legit_type_pct["TOPUP"] || 0 },
    { signal: "Card Payments",   fraud: data.fraud_type_pct["CARD_PAYMENT"] || 0,  legit: data.legit_type_pct["CARD_PAYMENT"] || 0 },
    { signal: "P2P Transfers",   fraud: data.fraud_type_pct["P2P"] || 0,           legit: data.legit_type_pct["P2P"] || 0 },
  ];

  return (
    <div style={{ padding: "48px 56px", maxWidth: 1100, margin: "0 auto" }}>
      <PageHeader
        overline="Brief 2B"
        title="KYC-Passed Fraudsters"
        description={`${fmt(data.fraud_count)} fraud-labelled transactions from KYC-passed users sit alongside ${fmt(data.legit_count)} legitimate transactions from KYC-passed users who never fraud — a behavioural gap identity checks alone will not close.`}
        recommendation="Stand up velocity on top-up followed by ATM or bank transfer, tighten outbound limits while KYC is still PENDING, and pair those controls with merchant-country skew from the table and chart below."
        methodology={
          <>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Cohort rules</p>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              <strong>Fraud cohort</strong>: KYC-passed users with at least one fraud-labelled transaction.{" "}
              <strong>Legit cohort</strong>: KYC-passed users with no fraud history. Tables compare fraud-labelled vs legitimate-labelled <em>transactions</em> within those user sets — not all platform fraud. Channel shares are % of each cohort’s labelled txns; merchant country uses <code>MERCHANT_COUNTRY</code> across movement types in that universe.
            </p>
          </>
        }
      />

      {/* User count summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {[
          { label: "KYC-Passed Fraudsters",  value: fmt(data.kyc_fraud_users ?? 0), note: "100% fraud ratio — zero legitimate transactions", red: true },
          { label: "KYC-Passed Legit Users", value: fmt(data.kyc_legit_users ?? 0), note: "Comparison group for behavioural analysis", red: false },
        ].map((s) => (
          <div key={s.label} style={{ background: "#ffffff", border: "1px solid #ebebeb", borderRadius: 12, padding: "28px 32px" }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#a3a3a3", marginBottom: 10 }}>
              {s.label}
            </p>
            <p style={{ fontSize: 36, fontWeight: 700, color: s.red ? "#cf1322" : "#0f0f0f", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 8 }}>
              {s.value}
            </p>
            <p style={{ fontSize: 12, color: "#a3a3a3" }}>{s.note}</p>
          </div>
        ))}
      </div>

      {/* Per-user behavioural comparison */}
      <div style={{ background: "#ffffff", border: "1px solid #ebebeb", borderRadius: 12, marginBottom: 32, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #f5f5f5" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#171717" }}>Behavioural Comparison — Per-User Averages</p>
        </div>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #f5f5f5" }}>
              {["Metric", "KYC-Passed Fraudsters", "Legitimate Users"].map((h, i) => (
                <th key={h} style={{ padding: "12px 24px", textAlign: i === 0 ? "left" : "right", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "#a3a3a3" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { label: "Avg transactions / user", fraud: String(data.fraud_avg_txns_per_user ?? 0), legit: String(data.legit_avg_txns_per_user ?? 0) },
              { label: "Avg countries / user",    fraud: String(data.fraud_avg_countries ?? 0),    legit: String(data.legit_avg_countries ?? 0) },
              { label: "Median transaction size", fraud: fmtM(data.fraud_median_txn_amount ?? data.fraud_avg_amount), legit: fmtM(data.legit_median_txn_amount ?? data.legit_avg_amount) },
              { label: "Avg transaction size",     fraud: fmtM(data.fraud_avg_amount),              legit: fmtM(data.legit_avg_amount) },
              { label: "Median birth year",       fraud: String(data.fraud_median_birth_year ?? data.fraud_avg_birth ?? 0), legit: String(data.legit_median_birth_year ?? data.legit_avg_birth ?? 0) },
              { label: "Avg birth year",           fraud: String(data.fraud_avg_birth ?? 0),        legit: String(data.legit_avg_birth ?? 0) },
              { label: "Fraud ratio",              fraud: "100%",                                   legit: "0%" },
            ].map((r, i, arr) => (
              <tr key={r.label} style={{ borderBottom: i < arr.length - 1 ? "1px solid #fafafa" : "none" }}>
                <td style={{ padding: "14px 24px", fontWeight: 500, color: "#404040" }}>{r.label}</td>
                <td style={{ padding: "14px 24px", textAlign: "right", fontWeight: 600, color: "#cf1322" }}>{r.fraud}</td>
                <td style={{ padding: "14px 24px", textAlign: "right", fontWeight: 600, color: "#0f0f0f" }}>{r.legit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Radar */}
        <Panel
          title="Transaction Type Mix"
          description="Channel mix differs between fraud-labelled and legitimate-labelled transactions for KYC-passed cohorts."
          methodology="Percentages are each cohort’s share of its own labelled transactions (fraud rows only in the fraud series; legitimate rows in the legit series)."
        >
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#f0f0f0" />
              <PolarAngleAxis dataKey="type" tick={{ fill: "#737373", fontSize: 11, fontFamily: "inherit" }} />
              <Radar name="Fraud" dataKey="Fraud" stroke="#cf1322" fill="#cf1322" fillOpacity={0.08} />
              <Radar name="Legitimate" dataKey="Legitimate" stroke="#0f0f0f" fill="#0f0f0f" fillOpacity={0.05} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#a3a3a3" }} />
            </RadarChart>
          </ResponsiveContainer>
        </Panel>

        {/* Signals */}
        <Panel
          title="Behavioural Signals"
          description="Distance from the legitimate KYC-passed baseline by channel (practical screen for rule design)."
          methodology="“Anomalous” when absolute percentage-point gap exceeds 2 vs legit baseline — a pragmatic threshold, not a statistical test."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {signals.map((s) => {
              const diff = s.fraud - s.legit;
              const anomaly = Math.abs(diff) > 2;
              return (
                <div key={s.signal} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: anomaly ? "#fff8f8" : "#fafafa",
                  border: `1px solid ${anomaly ? "#fde8e8" : "#f0f0f0"}`,
                }}>
                  <span style={{ fontSize: 13, color: "#404040", fontWeight: 500 }}>{s.signal}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#cf1322" }}>F {s.fraud}%</span>
                    <span style={{ color: "#e5e5e5" }}>·</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#737373" }}>L {s.legit}%</span>
                    {anomaly && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: diff > 0 ? "#cf1322" : "#737373" }}>
                        {diff > 0 ? "+" : ""}{diff.toFixed(1)}pp
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", borderRadius: 8, background: "#fafafa", border: "1px solid #f0f0f0",
            }}>
              <span style={{ fontSize: 13, color: "#404040", fontWeight: 500 }}>Birth year (median · avg)</span>
              <span style={{ fontSize: 12, color: "#737373" }}>
                Fraud <strong style={{ color: "#0f0f0f" }}>{data.fraud_median_birth_year ?? data.fraud_avg_birth}</strong>
                <span style={{ color: "#a3a3a3" }}> · {data.fraud_avg_birth}</span>
                {" · "}
                Legit <strong style={{ color: "#0f0f0f" }}>{data.legit_median_birth_year ?? data.legit_avg_birth}</strong>
                <span style={{ color: "#a3a3a3" }}> · {data.legit_avg_birth}</span>
              </span>
            </div>
          </div>
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
        <Panel title="Fraud Rate by Transaction Type">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={rateBarData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "#a3a3a3", fontSize: 10, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a3a3a3", fontSize: 10, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <ChartTooltipRoot>
                      {label != null && label !== "" && <ChartTooltipTitle>{label}</ChartTooltipTitle>}
                      <ChartTooltipRows>
                        <ChartTooltipRow label="Fraud rate" value={`${payload[0].value}%`} valueColor="#cf1322" />
                      </ChartTooltipRows>
                    </ChartTooltipRoot>
                  ) : null
                }
                cursor={{ fill: "#fafafa" }}
              />
              <Bar dataKey="rate" radius={[3, 3, 0, 0]}>
                {rateBarData.map((e) => (
                  <Cell key={e.name} fill={e.rate > 5 ? "#cf1322" : e.rate > 2 ? "#ad6800" : "#0f0f0f"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="KYC Status Breakdown" noPad>
          <div>
            {kycRows.map((r, i) => {
              const rate = r.total ? Math.round(r.fraud / r.total * 10000) / 100 : 0;
              return (
                <div key={r.status} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 24px",
                  borderBottom: i < kycRows.length - 1 ? "1px solid #fafafa" : "none",
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#171717" }}>{r.status}</p>
                    <p style={{ fontSize: 12, color: "#a3a3a3", marginTop: 2 }}>{fmt(r.total)} transactions</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#cf1322" }}>{fmt(r.fraud)} fraud</p>
                    <p style={{ fontSize: 12, color: "#a3a3a3", marginTop: 2 }}>{rate}% rate</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #ebebeb", borderRadius: 12, marginBottom: 24, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #f5f5f5" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#171717" }}>Merchant country mix</p>
          <p style={{ fontSize: 12, color: "#a3a3a3", marginTop: 4 }}>Share of all transactions from KYC-passed fraudster users vs KYC-passed legitimate users (top markets).</p>
        </div>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #f5f5f5" }}>
              {["Country", "Fraud cohort %", "n", "Legit cohort %", "n"].map((h, i) => (
                <th key={`merchant-country-mix-${i}`} style={{ padding: "12px 24px", textAlign: i === 0 ? "left" : "right", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "#a3a3a3" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {merchantRows.map((row, i) => (
              <tr key={row.country} style={{ borderBottom: i < merchantRows.length - 1 ? "1px solid #fafafa" : "none" }}>
                <td style={{ padding: "14px 24px", fontWeight: 500, color: "#404040" }}>{row.country}</td>
                <td style={{ padding: "14px 24px", textAlign: "right", fontWeight: 600, color: "#cf1322" }}>{row.fraudPct}%</td>
                <td style={{ padding: "14px 24px", textAlign: "right", color: "#737373" }}>{fmt(row.fraudN)}</td>
                <td style={{ padding: "14px 24px", textAlign: "right", color: "#404040" }}>{row.legitPct}%</td>
                <td style={{ padding: "14px 24px", textAlign: "right", color: "#737373" }}>{fmt(row.legitN)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Panel
        title="Merchant country distribution"
        description="Where each cohort concentrates merchant-country exposure — read with channel skew above."
        methodology="Same universe as the merchant table: MERCHANT_COUNTRY on each movement row for users in the fraud vs legit KYC-passed cohorts; bars show % of that cohort’s transactions."
      >
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={merchantChartData} margin={{ top: 8, right: 8, left: 4, bottom: 56 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#a3a3a3", fontSize: 11, fontFamily: "inherit" }}
              axisLine={{ stroke: "#ebebeb" }}
              tickLine={false}
              interval={0}
              angle={-40}
              textAnchor="end"
              height={70}
            />
            <YAxis
              tick={{ fill: "#a3a3a3", fontSize: 11, fontFamily: "inherit" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip
              cursor={{ fill: "#fafafa" }}
              content={(props) =>
                props.active && props.payload?.length ? (
                  <ChartTooltipFromPayload
                    {...props}
                    formatValue={(v) => `${Number(v).toFixed(1)}%`}
                  />
                ) : null
              }
            />
            <Legend wrapperStyle={{ fontSize: 11, color: "#a3a3a3", paddingTop: 8 }} />
            <Bar name="KYC-passed fraudsters" dataKey="fraudsters" fill="#cf1322" radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar name="KYC-passed legitimate users" dataKey="legitimate" fill="#0f0f0f" radius={[3, 3, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
        <p style={{ fontSize: 12, color: "#a3a3a3", fontStyle: "italic", textAlign: "center", marginTop: 8, marginBottom: 0 }}>
          Figure — Merchant country targeting: fraudster vs legitimate cohorts (percent of each cohort’s transactions).
        </p>
      </Panel>

      <div style={{
        background: "#f9f9f9",
        border: "1px solid #ebebeb",
        borderLeft: "3px solid #cf1322",
        borderRadius: 12,
        padding: "20px 24px",
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#a3a3a3", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 10 }}>Recommendation</p>
        <p style={{ fontSize: 14, color: "#404040", lineHeight: 1.6, margin: 0 }}>
          Move beyond static ID checks toward <strong>continuous, transaction-level</strong> monitoring. Implement <strong>velocity rules</strong> that escalate review on a &ldquo;top-up and extract&rdquo; pattern — for example a material TOPUP followed within <strong>30 minutes</strong> by ATM or bank transfer — and route those cases ahead of balance exit. For accounts still in <strong>PENDING</strong> KYC, apply strict outbound caps until status resolves: in this extract,{" "}
          <strong style={{ color: "#cf1322" }}>{pendingFraudRate}%</strong> of PENDING-tagged transactions are fraud-labelled ({fmt(pendingFraud)} / {fmt(pendingTot)}), vs{" "}
          <strong>{failedFraudRate}%</strong> on FAILED ({fmt(failedFraud)} / {fmt(failedTot)}). Layer those controls with <strong>merchant-country skew</strong> from the chart above to prioritise corridors where fraudsters over-index vs legitimate users.
        </p>
      </div>
    </div>
  );
}

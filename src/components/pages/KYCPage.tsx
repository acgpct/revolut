"use client";

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, Legend } from "recharts";
import Panel from "@/components/ui/Panel";
import PageHeader from "@/components/ui/PageHeader";
import type { Brief2b, FraudByType } from "@/lib/types";

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
        description={`${fmt(data.fraud_count)} fraudulent transactions from users who passed KYC checks, compared against ${fmt(data.legit_count)} legitimate KYC-passed users.`}
      />

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 40 }}>
        {[
          { label: "KYC-Passed Fraud Txns", value: fmt(data.fraud_count), red: false },
          { label: "Avg Fraud Transaction",  value: fmtM(data.fraud_avg_amount), red: true },
          { label: "Avg Legit Transaction",  value: fmtM(data.legit_avg_amount), red: false },
        ].map((s) => (
          <div key={s.label} style={{
            background: "#ffffff", border: "1px solid #ebebeb", borderRadius: 12, padding: "24px 28px",
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#a3a3a3", marginBottom: 10 }}>
              {s.label}
            </p>
            <p style={{ fontSize: 32, fontWeight: 700, color: s.red ? "#cf1322" : "#0f0f0f", letterSpacing: "-0.03em", lineHeight: 1 }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Radar */}
        <Panel title="Transaction Type Mix" description="Fraud vs legitimate KYC-passed users (%)">
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
        <Panel title="Behavioural Signals" description="Percentage-point difference vs legitimate users">
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
              <span style={{ fontSize: 13, color: "#404040", fontWeight: 500 }}>Avg Birth Year</span>
              <span style={{ fontSize: 12, color: "#737373" }}>
                Fraud <strong style={{ color: "#0f0f0f" }}>{data.fraud_avg_birth}</strong>
                {" · "}
                Legit <strong style={{ color: "#0f0f0f" }}>{data.legit_avg_birth}</strong>
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
                content={({ active, payload, label }) => active && payload?.length ? (
                  <div style={{
                    background: "#fff", border: "1px solid #ebebeb", borderRadius: 10,
                    padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", fontSize: 12,
                  }}>
                    <p style={{ fontWeight: 600, color: "#171717", marginBottom: 4 }}>{label}</p>
                    <p style={{ color: "#737373" }}>{payload[0].value}% fraud rate</p>
                  </div>
                ) : null}
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
                    <p style={{ fontSize: 12, color: "#a3a3a3", marginTop: 2 }}>{fmt(r.total)} users</p>
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
    </div>
  );
}

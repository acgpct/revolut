"use client";

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from "recharts";
import SectionCard from "./SectionCard";
import type { Brief2b, FraudByType } from "@/lib/types";

interface Props {
  data: Brief2b;
  fraudByType: FraudByType[];
  kycStatus: Record<string, number>;
  kycFraudStatus: Record<string, number>;
}

const fmt  = (n: number) => n.toLocaleString();
const fmtM = (n: number) => {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `£${(n / 1_000).toFixed(0)}K`;
  return `£${n}`;
};

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8ed", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
      <p style={{ fontSize: 12, color: "#6b6b80", marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ fontSize: 13, fontWeight: 600, color: p.color }}>
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
};

export default function KYCSection({ data, fraudByType, kycStatus, kycFraudStatus }: Props) {
  const txnTypes = ["CARD_PAYMENT", "TOPUP", "ATM", "BANK_TRANSFER", "P2P"];
  const shortLabels: Record<string, string> = {
    CARD_PAYMENT: "Card", TOPUP: "Top-up", ATM: "ATM", BANK_TRANSFER: "Transfer", P2P: "P2P",
  };

  const radarData = txnTypes.map((t) => ({
    type: shortLabels[t],
    "Fraud": data.fraud_type_pct[t] || 0,
    "Legitimate": data.legit_type_pct[t] || 0,
  }));

  const rateBarData = fraudByType.map((t) => ({
    name: t.type.replace(/_/g, " "),
    rate: t.rate,
  }));

  const kycRows = [
    { status: "PASSED",  total: kycStatus.PASSED  || 0, fraud: kycFraudStatus.PASSED  || 0, color: "#4f46e5", bg: "#eef2ff" },
    { status: "FAILED",  total: kycStatus.FAILED   || 0, fraud: kycFraudStatus.FAILED  || 0, color: "#dc2626", bg: "#fff1f1" },
    { status: "PENDING", total: kycStatus.PENDING  || 0, fraud: kycFraudStatus.PENDING || 0, color: "#d97706", bg: "#fffbeb" },
    { status: "NONE",    total: kycStatus.NONE     || 0, fraud: kycFraudStatus.NONE    || 0, color: "#6b6b80", bg: "#f5f5f7" },
  ];

  const signals = [
    { signal: "ATM Withdrawals",  fraud: data.fraud_type_pct["ATM"] || 0,           legit: data.legit_type_pct["ATM"] || 0,           flag: true },
    { signal: "Bank Transfers",   fraud: data.fraud_type_pct["BANK_TRANSFER"] || 0, legit: data.legit_type_pct["BANK_TRANSFER"] || 0, flag: true },
    { signal: "Top-ups",          fraud: data.fraud_type_pct["TOPUP"] || 0,         legit: data.legit_type_pct["TOPUP"] || 0,         flag: true },
    { signal: "Card Payments",    fraud: data.fraud_type_pct["CARD_PAYMENT"] || 0,  legit: data.legit_type_pct["CARD_PAYMENT"] || 0,  flag: false },
    { signal: "P2P Transfers",    fraud: data.fraud_type_pct["P2P"] || 0,           legit: data.legit_type_pct["P2P"] || 0,           flag: false },
  ];

  return (
    <SectionCard
      tag="Brief 2B"
      tagColor="black"
      title="KYC-Passed Fraudsters — Behavioural Patterns"
      subtitle={`${fmt(data.fraud_count)} fraudulent transactions from users who passed KYC. Compared against ${fmt(data.legit_count)} legitimate KYC-passed users.`}
    >
      {/* Alert bar */}
      <div style={{
        background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: "20px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            ⚠ KYC Passed — Yet Fraudulent
          </p>
          <p style={{ fontSize: 34, fontWeight: 800, color: "#0a0a0f", letterSpacing: "-0.03em", lineHeight: 1 }}>
            {fmt(data.fraud_count)}{" "}
            <span style={{ fontSize: 14, fontWeight: 400, color: "#6b6b80" }}>transactions</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 32 }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: "#9898ac", marginBottom: 4 }}>Avg Fraud Txn</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#dc2626" }}>{fmtM(data.fraud_avg_amount)}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: "#9898ac", marginBottom: 4 }}>Avg Legit Txn</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>{fmtM(data.legit_avg_amount)}</p>
          </div>
        </div>
      </div>

      {/* Radar + signals */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#6b6b80", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Transaction Type Mix
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e8e8ed" />
              <PolarAngleAxis dataKey="type" tick={{ fill: "#6b6b80", fontSize: 11 }} />
              <Radar name="Fraud" dataKey="Fraud" stroke="#dc2626" fill="#dc2626" fillOpacity={0.15} />
              <Radar name="Legitimate" dataKey="Legitimate" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.08} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#6b6b80" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#6b6b80", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Behavioural Signals
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {signals.map((s) => {
              const diff = s.fraud - s.legit;
              const isAnomaly = Math.abs(diff) > 2;
              return (
                <div key={s.signal} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 14px", borderRadius: 10,
                  background: isAnomaly ? "#fff1f1" : "#f9f9fb",
                  border: `1px solid ${isAnomaly ? "#fecaca" : "#e8e8ed"}`,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{s.signal}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#dc2626" }}>F: {s.fraud}%</span>
                    <span style={{ fontSize: 12, color: "#9898ac" }}>vs</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5" }}>L: {s.legit}%</span>
                    {isAnomaly && (
                      <span style={{ fontSize: 11, fontWeight: 800, color: diff > 0 ? "#dc2626" : "#16a34a" }}>
                        {diff > 0 ? "▲" : "▼"}{Math.abs(diff).toFixed(1)}pp
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "#f9f9fb", border: "1px solid #e8e8ed", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Avg Birth Year</span>
              <span style={{ fontSize: 13, color: "#6b6b80" }}>
                Fraud <strong style={{ color: "#dc2626" }}>{data.fraud_avg_birth}</strong> · Legit <strong style={{ color: "#4f46e5" }}>{data.legit_avg_birth}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fraud rate by type bar */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#6b6b80", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Fraud Rate by Transaction Type
        </p>
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={rateBarData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: "#9898ac", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9898ac", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div style={{ background: "#fff", border: "1px solid #e8e8ed", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                    <p style={{ fontSize: 12, color: "#6b6b80", marginBottom: 2 }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>Fraud Rate: {payload[0].value}%</p>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
              {rateBarData.map((e) => (
                <Cell key={e.name} fill={e.rate > 5 ? "#dc2626" : e.rate > 2 ? "#d97706" : "#4f46e5"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* KYC status grid */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#6b6b80", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          KYC Status Breakdown
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {kycRows.map((r) => {
            const rate = r.total ? Math.round(r.fraud / r.total * 10000) / 100 : 0;
            return (
              <div key={r.status} style={{ background: r.bg, borderRadius: 12, padding: "16px 18px", textAlign: "center" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: r.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  {r.status}
                </p>
                <p style={{ fontSize: 22, fontWeight: 750, color: "#0a0a0f", letterSpacing: "-0.02em" }}>{fmt(r.total)}</p>
                <p style={{ fontSize: 12, color: "#dc2626", fontWeight: 600, marginTop: 4 }}>{fmt(r.fraud)} fraud</p>
                <p style={{ fontSize: 11, color: "#9898ac", marginTop: 2 }}>{rate}% rate</p>
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

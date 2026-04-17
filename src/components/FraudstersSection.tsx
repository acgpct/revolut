"use client";

import SectionCard from "./SectionCard";
import type { Fraudster } from "@/lib/types";

interface Props {
  fraudsters: Fraudster[];
  totalFraudsters: number;
}

const fmt  = (n: number) => n.toLocaleString();
const fmtM = (n: number) => {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `£${(n / 1_000).toFixed(1)}K`;
  return `£${n}`;
};

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  CARD_PAYMENT:  { bg: "#eef2ff", color: "#4338ca" },
  TOPUP:         { bg: "#f0fdf4", color: "#15803d" },
  ATM:           { bg: "#fffbeb", color: "#b45309" },
  BANK_TRANSFER: { bg: "#fff1f1", color: "#dc2626" },
  P2P:           { bg: "#f5f3ff", color: "#7c3aed" },
};

const RANKS = [
  { medalColor: "#CA8A04", medalBg: "#fef9c3", label: "1st" },
  { medalColor: "#6b7280", medalBg: "#f3f4f6", label: "2nd" },
  { medalColor: "#b45309", medalBg: "#fef3c7", label: "3rd" },
  { medalColor: "#dc2626", medalBg: "#fff1f1", label: "4th" },
  { medalColor: "#dc2626", medalBg: "#fff1f1", label: "5th" },
];

export default function FraudstersSection({ fraudsters, totalFraudsters }: Props) {
  return (
    <SectionCard
      tag="Bonus"
      tagColor="black"
      title="Top 5 Priority Fraudsters"
      subtitle={`Composite risk score across ${fmt(totalFraudsters)} unique fraud actors: transaction frequency (40%) + financial impact (30%) + method diversity + geographic spread.`}
    >
      {/* Rationale */}
      <div style={{ background: "#fff1f1", border: "1px solid #fecaca", borderRadius: 12, padding: "16px 20px", display: "flex", gap: 12 }}>
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>🎯</span>
        <p style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.6 }}>
          <strong>Scoring Rationale:</strong> Ranking purely by stolen amount misses sophisticated actors.
          Our composite score rewards <em>frequency</em> (persistent actors are harder to catch),{" "}
          <em>method diversity</em> (using multiple channels evades rule-based detection), and{" "}
          <em>geographic spread</em> (multi-country activity signals organised rings).
          {" "}<strong>Methodology note:</strong> <em>Countries Hit</em> counts transactions with no recorded merchant country as a distinct geographic exposure — one above what a <code>nunique()</code> call would return — because unattributed activity represents a genuine data-quality risk signal.
        </p>
      </div>

      {/* Fraudster cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {fraudsters.map((f, i) => {
          const r = RANKS[i] || RANKS[4];
          return (
            <div key={f.full_id} style={{
              background: "#fff",
              border: "1px solid #e8e8ed",
              borderRadius: 16,
              padding: "22px 24px",
              display: "grid",
              gridTemplateColumns: "56px 1fr auto",
              gap: 20,
              alignItems: "start",
              boxShadow: i === 0 ? "0 2px 12px rgba(202,138,4,0.1)" : "none",
            }}>
              {/* Medal */}
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: r.medalBg,
                  border: `2px solid ${r.medalColor}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800, color: r.medalColor,
                  margin: "0 auto",
                }}>
                  {i + 1}
                </div>
                <p style={{ fontSize: 11, color: "#9898ac", marginTop: 4 }}>{r.label}</p>
              </div>

              {/* Details */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  <code style={{
                    fontSize: 12, color: "#4338ca", background: "#eef2ff",
                    padding: "3px 10px", borderRadius: 6, fontFamily: "monospace",
                  }}>
                    {f.full_id}
                  </code>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                    background: f.kyc === "PASSED" ? "#fffbeb" : "#fff1f1",
                    color: f.kyc === "PASSED" ? "#b45309" : "#dc2626",
                    border: `1px solid ${f.kyc === "PASSED" ? "#fde68a" : "#fecaca"}`,
                  }}>
                    KYC {f.kyc}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 14 }}>
                  {[
                    { label: "TRANSACTIONS",  value: fmt(f.txns),        color: "#dc2626" },
                    { label: "TOTAL AMOUNT",  value: fmtM(f.amount),     color: "#dc2626" },
                    { label: "METHODS USED",  value: String(f.types_used),  color: "#0a0a0f" },
                    { label: "COUNTRIES HIT", value: String(f.countries_hit), color: "#0a0a0f" },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#9898ac", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{stat.label}</p>
                      <p style={{ fontSize: 22, fontWeight: 750, color: stat.color, letterSpacing: "-0.02em" }}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(f.type_breakdown).map(([type, count]) => {
                    const tc = TYPE_COLORS[type] || { bg: "#f5f5f7", color: "#6b6b80" };
                    return (
                      <span key={type} style={{
                        fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
                        background: tc.bg, color: tc.color,
                      }}>
                        {type.replace(/_/g, " ")} ×{count}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Score */}
              <div style={{ textAlign: "right", minWidth: 90 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#9898ac", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Score</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: r.medalColor, letterSpacing: "-0.02em" }}>{f.score.toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

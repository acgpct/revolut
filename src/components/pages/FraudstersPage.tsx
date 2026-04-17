"use client";

import PageHeader from "@/components/ui/PageHeader";
import type { Fraudster } from "@/lib/types";

const fmt  = (n: number) => n.toLocaleString();
const fmtM = (n: number) => {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `£${(n / 1_000).toFixed(1)}K`;
  return `£${n}`;
};

const TYPE_LABEL: Record<string, string> = {
  CARD_PAYMENT: "Card", TOPUP: "Top-up", ATM: "ATM", BANK_TRANSFER: "Transfer", P2P: "P2P",
};

export default function FraudstersPage({ fraudsters, totalFraudsters }: { fraudsters: Fraudster[]; totalFraudsters: number }) {
  return (
    <div style={{ padding: "48px 56px", maxWidth: 1100, margin: "0 auto" }}>
      <PageHeader
        overline="Bonus"
        title="Top 5 Priority Fraudsters"
        description={`Ranked from ${fmt(totalFraudsters)} unique fraud actors using a composite score: frequency (40%) + financial impact (30%) + method diversity + geographic spread.`}
      />

      {/* Rationale */}
      <div style={{
        background: "#ffffff",
        border: "1px solid #ebebeb",
        borderRadius: 12,
        padding: "24px 28px",
        marginBottom: 40,
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
      }}>
        <div style={{ width: 3, flexShrink: 0, borderRadius: 99, background: "#e5e5e5", alignSelf: "stretch" }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#171717", marginBottom: 4 }}>
            Scoring Rationale
          </p>
          <p style={{ fontSize: 13, color: "#737373", lineHeight: 1.6 }}>
            Ranking by stolen amount alone misses sophisticated actors. Our composite score rewards{" "}
            <em>frequency</em> (persistent actors evade one-off detection),{" "}
            <em>method diversity</em> (multi-channel activity defeats rule-based systems), and{" "}
            <em>geographic spread</em> (multi-country activity signals organised crime rings).
          </p>
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {fraudsters.map((f, i) => (
          <div key={f.full_id} style={{
            background: "#ffffff",
            border: "1px solid #ebebeb",
            borderRadius: 12,
            padding: "28px 32px",
            display: "grid",
            gridTemplateColumns: "48px 1fr auto",
            gap: 28,
            alignItems: "start",
          }}>
            {/* Rank */}
            <div style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "1px solid #ebebeb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#a3a3a3" }}>#{i + 1}</span>
            </div>

            {/* Detail */}
            <div>
              {/* ID + KYC */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const, marginBottom: 20 }}>
                <code style={{
                  fontSize: 12,
                  color: "#404040",
                  background: "#f5f5f5",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontFamily: "monospace",
                  letterSpacing: "0.02em",
                }}>
                  {f.full_id}
                </code>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: f.kyc === "PASSED" ? "#fffbe6" : "#fff1f0",
                  color: f.kyc === "PASSED" ? "#ad6800" : "#cf1322",
                }}>
                  KYC {f.kyc}
                </span>
              </div>

              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 20 }}>
                {[
                  { label: "Transactions",  value: fmt(f.txns),             red: true },
                  { label: "Total Amount",  value: fmtM(f.amount),          red: true },
                  { label: "Methods Used",  value: String(f.types_used),    red: false },
                  { label: "Countries Hit", value: String(f.countries_hit), red: false },
                ].map((s) => (
                  <div key={s.label}>
                    <p style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.08em",
                      color: "#a3a3a3",
                      marginBottom: 6,
                    }}>
                      {s.label}
                    </p>
                    <p style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: s.red ? "#cf1322" : "#0f0f0f",
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Method tags */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                {Object.entries(f.type_breakdown).map(([type, count]) => (
                  <span key={type} style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: "#f5f5f5",
                    color: "#595959",
                    letterSpacing: "0.01em",
                  }}>
                    {TYPE_LABEL[type] || type} ×{count}
                  </span>
                ))}
              </div>
            </div>

            {/* Score */}
            <div style={{ textAlign: "right", paddingLeft: 16 }}>
              <p style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                color: "#a3a3a3",
                marginBottom: 6,
              }}>
                Score
              </p>
              <p style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#0f0f0f",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}>
                {f.score.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

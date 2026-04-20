"use client";

import Panel from "@/components/ui/Panel";
import PageHeader from "@/components/ui/PageHeader";
import type { Brief1 } from "@/lib/types";
import { notTrueConvertedUserCount } from "@/lib/brief1Metrics";

const fmt = (n: number | undefined | null) => (n ?? 0).toLocaleString();

export default function ConversionPage({ data }: { data: Brief1 }) {
  const total = data.unique_users || 1;
  const funnelSteps = [
    { label: "Registered Users", value: data.unique_users ?? 0, pct: 100 },
    { label: "Topped Up", value: data.topup_users ?? 0, pct: Math.round(((data.topup_users ?? 0) / total) * 100) },
    { label: "KYC Passed", value: data.kyc_passed_users ?? 0, pct: Math.round(((data.kyc_passed_users ?? 0) / total) * 100) },
    { label: "Legitimate Card Payment", value: data.legit_card_users ?? 0, pct: Math.round(((data.legit_card_users ?? 0) / total) * 100) },
    { label: "Revolut Converted (true)", value: data.revolut_converted_users ?? 0, pct: Math.round(((data.revolut_converted_users ?? 0) / total) * 100) },
  ];

  const gap = ((data.marketing_rate ?? 0) - (data.strict_rate ?? 0)).toFixed(1);

  return (
    <div style={{ padding: "48px 56px", maxWidth: 1100, margin: "0 auto" }}>
      <PageHeader
        overline="Brief 1"
        title="App Conversion Rate"
        description={`Marketing’s ${data.marketing_rate}% headline rate and the economics-grade ${data.strict_rate ?? data.revolut_rate}% rate answer different questions; using the wrong one for payback or risk silently misallocates spend.`}
        recommendation="Publish both KPIs with explicit labels, require non-fraud legitimate card payments in the strict numerator, and anchor Finance and Growth packs to the strict definition."
        methodology={
          <>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Definitions</p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <strong>Strict “converted”</strong>: KYC-passed user with ≥1 <em>legitimate</em> card payment (interchange).{" "}
              <strong>Marketing-style rate</strong>: users with ≥1 <code>CARD_PAYMENT</code> or <code>BANK_TRANSFER</code> (including fraud-labelled rows) ÷ all registered users — reconstructible from the extract; still not revenue-ready without KYC pass and legitimate card.
            </p>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              Funnel steps: registered → topped up → KYC passed → legitimate card payment → Revolut converted (true). Ghost users = counted toward marketing reach but excluded from strict converted.
            </p>
          </>
        }
      />

      {/* Rate comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        {[
          {
            label: "Marketing Definition",
            value: `${data.marketing_rate}%`,
            note: `${fmt(data.card_or_bank_users ?? 0)} users with card or bank transfer ÷ ${fmt(data.unique_users)} registered`,
            muted: true,
          },
          {
            label: "Strict Definition",
            value: `${data.strict_rate}%`,
            note: `${fmt(data.strict_converted_users ?? 0)} users (KYC passed + ≥1 legit card payment) ÷ ${fmt(data.unique_users)} total`,
            muted: false,
          },
        ].map((r) => (
          <div key={r.label} style={{
            background: "#ffffff",
            border: "1px solid #ebebeb",
            borderRadius: 12,
            padding: "32px 32px",
          }}>
            <p style={{
              fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const,
              letterSpacing: "0.08em", color: "#a3a3a3", marginBottom: 16,
            }}>
              {r.label}
            </p>
            <p style={{
              fontSize: 52,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              marginBottom: 12,
              color: r.muted ? "#d4d4d4" : "#0f0f0f",
            }}>
              {r.value}
            </p>
            <p style={{ fontSize: 13, color: "#a3a3a3" }}>{r.note}</p>
          </div>
        ))}
      </div>

      {/* Insight */}
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
        <div style={{
          width: 3,
          flexShrink: 0,
          borderRadius: 99,
          background: "#e5e5e5",
          alignSelf: "stretch",
        }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#171717", marginBottom: 4 }}>
            {gap}pp gap between marketing and the correct conversion rate
          </p>
          <p style={{ fontSize: 13, color: "#737373", lineHeight: 1.6 }}>
            Only {fmt(data.strict_converted_users ?? 0)} of {fmt(data.unique_users)} users meet the strict converted bar; {fmt(notTrueConvertedUserCount(data))} registered accounts do not. Full numerator and denominator rules for each headline rate are in the <strong>Method</strong> tooltip on the page title (this extract has no date column, so a 30-day window is not applied).
          </p>
        </div>
      </div>

      <Panel
        title="User Funnel"
        description="Progressive narrowing from all registered users to strict converted."
        methodology="Steps: Registered → Topped up → KYC passed → Legitimate card payment → Revolut converted (true). Percentages are share of all registered users in this extract."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {funnelSteps.map((s, i) => (
            <div key={s.label}>
              <div style={{
                background: "#fafafa",
                border: "1px solid #f0f0f0",
                borderRadius: 10,
                padding: "16px 20px",
                opacity: 1 - i * 0.15,
              }}>
                <p style={{
                  fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const,
                  letterSpacing: "0.08em", color: "#a3a3a3", marginBottom: 8,
                }}>
                  {s.label}
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: "#0f0f0f", letterSpacing: "-0.02em" }}>
                    {fmt(s.value)}
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#a3a3a3" }}>{s.pct}%</p>
                </div>
              </div>
              {i < funnelSteps.length - 1 && (
                <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
                  <div style={{ width: 1, height: 16, background: "#e5e5e5" }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import SectionCard from "./SectionCard";
import type { Brief1 } from "@/lib/types";
import { notTrueConvertedUserCount } from "@/lib/brief1Metrics";

const fmt = (n: number | undefined | null) => (n ?? 0).toLocaleString();

interface Props { data: Brief1 }

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8ed", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
      <p style={{ fontSize: 12, color: "#6b6b80", marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ fontSize: 13, fontWeight: 600, color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function ConversionSection({ data }: Props) {
  const txnTypeData = data.txn_types.map((t) => ({
    name: t.type.replace(/_/g, " "),
    Legitimate: t.count - t.fraud,
    Fraud: t.fraud,
  }));

  const totalUsers = data.unique_users || 1;
  const funnelSteps = [
    { label: "Registered Users", value: data.unique_users, pct: 100 },
    { label: "Topped Up", value: data.topup_users, pct: Math.round((data.topup_users / totalUsers) * 100) },
    { label: "KYC Passed", value: data.kyc_passed_users, pct: Math.round((data.kyc_passed_users / totalUsers) * 100) },
    { label: "Legitimate Card Payment", value: data.legit_card_users, pct: Math.round((data.legit_card_users / totalUsers) * 100) },
    { label: "Revolut Converted (true)", value: data.revolut_converted_users, pct: Math.round((data.revolut_converted_users / totalUsers) * 100) },
  ];

  return (
    <SectionCard
      tag="Brief 1"
      tagColor="black"
      title="Growth Audit — App Conversion Rate"
      subtitle="A converted user must pass KYC and make ≥1 legitimate card payment (interchange revenue). Marketing's headline rate inflates the numerator (any card activity, including fraud) and uses a smaller denominator (KYC-attempted only)."
    >
      {/* Rate comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {[
          { label: "Marketing Definition", value: `${data.marketing_rate}%`, sub: "Card users (incl. fraud) ÷ KYC-attempted — smaller denominator", color: "#d97706", bg: "#fffbeb" },
          { label: "Revolut Definition", value: `${data.revolut_rate}%`, sub: "KYC passed + ≥1 legitimate card payment ÷ all registered users", color: "#4f46e5", bg: "#eef2ff" },
        ].map((r) => (
          <div key={r.label} style={{ background: r.bg, borderRadius: 14, padding: "22px 24px" }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#6b6b80", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              {r.label}
            </p>
            <p style={{ fontSize: 44, fontWeight: 800, color: r.color, letterSpacing: "-0.04em", lineHeight: 1 }}>{r.value}</p>
            <p style={{ fontSize: 12, color: "#6b6b80", marginTop: 6 }}>{r.sub}</p>
          </div>
        ))}
      </div>

      {/* Insight */}
      <div style={{
        background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "16px 20px",
        display: "flex", gap: 12, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>💡</span>
        <p style={{ fontSize: 13, color: "#78350f", lineHeight: 1.6 }}>
          <strong>Marketing rate reconstruction:</strong> on this dataset the headline figure aligns with <em>any user with a card payment ÷ users who attempted KYC</em> — <strong>{data.marketing_rate}%</strong> — a numerator that includes fraudulent card use and a denominator smaller than all registered users.{" "}
          <strong>Why the gap vs true conversion?</strong> Many of those users never generate <em>interchange revenue</em> (non-card spend, or no legitimate card payment after KYC).
          The Revolut definition requires <strong>KYC passed</strong>, <strong>≥1 legitimate card payment</strong>, and ideally within 30 days of sign-up (date data unavailable here).
          This yields <strong>{data.revolut_rate}%</strong> — the only rate that represents a genuine, revenue-positive customer.
          {" "}<strong>{fmt(notTrueConvertedUserCount(data))} users</strong> of {fmt(data.unique_users)} registered accounts have not reached that bar.
        </p>
      </div>

      {/* Funnel */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#6b6b80", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          User Funnel
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8 }}>
          {funnelSteps.map((s, i) => (
            <div key={s.label} style={{
              background: "#f9f9fb", border: "1px solid #e8e8ed", borderRadius: 12, padding: "14px 10px",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                height: `${s.pct}%`, maxHeight: "100%",
                background: `rgba(79,70,229,${0.04 + i * 0.02})`,
                transition: "height 0.6s ease",
              }} />
              <p style={{ fontSize: 10, fontWeight: 600, color: "#9898ac", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, position: "relative", lineHeight: 1.25 }}>
                {s.label}
              </p>
              <p style={{ fontSize: 20, fontWeight: 750, color: "#0a0a0f", letterSpacing: "-0.02em", position: "relative" }}>{fmt(s.value)}</p>
              <p style={{ fontSize: 11, color: "#4f46e5", fontWeight: 600, marginTop: 4, position: "relative" }}>{s.pct}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bar chart */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#6b6b80", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Volume by Transaction Type
        </p>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={txnTypeData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }} barGap={4}>
            <XAxis dataKey="name" tick={{ fill: "#9898ac", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9898ac", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<Tip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#6b6b80", paddingTop: 8 }} />
            <Bar dataKey="Legitimate" stackId="a" fill="#c7d2fe" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Fraud" stackId="a" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import MetricCard from "@/components/ui/MetricCard";
import Panel from "@/components/ui/Panel";
import PageHeader from "@/components/ui/PageHeader";
import type { Analytics } from "@/lib/types";

const fmt  = (n: number) => n.toLocaleString();
const fmtB = (n: number) => {
  if (n >= 1_000_000_000) return `£${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `£${(n / 1_000_000).toFixed(0)}M`;
  return `£${(n / 1_000).toFixed(0)}K`;
};

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #ebebeb",
      borderRadius: 10,
      padding: "10px 14px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      fontSize: 12,
    }}>
      <p style={{ fontWeight: 600, color: "#171717", marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: "#737373" }}>
          {p.name}:{" "}
          <span style={{ fontWeight: 600, color: "#0f0f0f" }}>{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

export default function OverviewPage({ data }: { data: Analytics }) {
  const { overview, brief1, fraud_by_type } = data;

  const typeData = fraud_by_type.map((t) => ({
    name: t.type.replace(/_/g, " "),
    Legitimate: t.total - t.fraud,
    Fraud: t.fraud,
  }));

  return (
    <div style={{ padding: "48px 56px", maxWidth: 1100, margin: "0 auto" }}>
      <PageHeader
        title="Financial Crime Overview"
        description="High-level summary of transaction volume, fraud exposure, and conversion metrics across the full dataset."
      />

      {/* KPI row 1 — volume */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        <MetricCard
          label="Total Transactions"
          value={fmt(overview.total_txns)}
          sub="across all types"
        />
        <MetricCard
          label="Unique Users"
          value={fmt(overview.unique_users)}
          sub="registered accounts"
        />
        <MetricCard
          label="Total Volume"
          value={fmtB(overview.total_amount)}
          sub="total transaction value"
        />
      </div>

      {/* KPI row 2 — fraud */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 48 }}>
        <MetricCard
          label="Fraud Transactions"
          value={fmt(overview.total_fraud)}
          sub="confirmed fraud events"
          badge={`${overview.fraud_rate}% rate`}
          badgeVariant="red"
        />
        <MetricCard
          label="Fraud Losses"
          value={fmtB(overview.fraud_amount)}
          sub="total fraud value"
          badge={`${overview.fraud_amount_pct}% of volume`}
          badgeVariant="red"
        />
        <MetricCard
          label="Revolut Conversion"
          value={`${brief1.revolut_rate}%`}
          sub={`vs ${brief1.marketing_rate}% marketing claim`}
          badge={`−${(brief1.marketing_rate - brief1.revolut_rate).toFixed(1)}pp gap`}
          badgeVariant="amber"
        />
      </div>

      {/* Chart */}
      <Panel title="Volume by Transaction Type" description="Legitimate vs fraud transactions per category">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={typeData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={2}>
            <XAxis
              dataKey="name"
              tick={{ fill: "#a3a3a3", fontSize: 11, fontFamily: "inherit" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#a3a3a3", fontSize: 11, fontFamily: "inherit" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<ChartTip />} cursor={{ fill: "#fafafa" }} />
            <Bar dataKey="Legitimate" stackId="a" fill="#f0f0f0" />
            <Bar dataKey="Fraud" stackId="a" fill="#0f0f0f" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 20, marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: "#f0f0f0", border: "1px solid #e5e5e5" }} />
            <span style={{ fontSize: 12, color: "#a3a3a3" }}>Legitimate</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: "#0f0f0f" }} />
            <span style={{ fontSize: 12, color: "#a3a3a3" }}>Fraud</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartTooltipFromPayload } from "@/components/ui/ChartTooltip";
import MetricCard from "@/components/ui/MetricCard";
import Panel from "@/components/ui/Panel";
import PageHeader from "@/components/ui/PageHeader";
import type { Analytics } from "@/lib/types";
import { fmtRawAmountMajor } from "@/lib/gbpMinor";

const fmt  = (n: number) => n.toLocaleString();
const fmtB = (n: number) => {
  if (n >= 1_000_000_000) return `£${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `£${(n / 1_000_000).toFixed(0)}M`;
  return `£${(n / 1_000).toFixed(0)}K`;
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
        description="Single-dataset view of volume, fraud exposure, and conversion pressure so leadership can align growth, risk, and TM investment."
        recommendation="Treat post-onboarding transaction monitoring as the structural complement to KYC — see the executive summary at the foot of this page for assessment and priority."
        methodology={
          <>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Figure & metrics</p>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              Volume chart stacks legitimate vs fraud <em>transaction counts</em> by <code>TYPE</code> — tall bars show activity mix, not implied fraud rate. “Raw” KPIs sum <code>AMOUNT</code> as stored (mixed currencies). “Fiat GBP (ex crypto)” converts fiat rows to GBP using embedded daily rates; BTC/ETH/LTC/XRP are excluded from those sums.
            </p>
          </>
        }
      />

      {/* KPI row 1 — volume */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
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
          label="Total Volume (raw)"
          value={fmtRawAmountMajor(overview.total_amount)}
          sub="naive sum of AMOUNT"
        />
        <MetricCard
          label="Total Volume (fiat GBP)"
          value={typeof overview.total_amount_gbp_fiat === "number" ? fmtB(overview.total_amount_gbp_fiat) : "—"}
          sub={overview.fx_rates_as_of_utc ? `ex crypto · FX ${overview.fx_rates_as_of_utc.slice(0, 16)}…` : "ex crypto · FX snapshot"}
        />
      </div>

      {/* KPI row 2 — fraud */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 48 }}>
        <MetricCard
          label="Fraud Transactions"
          value={fmt(overview.total_fraud)}
          sub="confirmed fraud events"
          badge={`${overview.fraud_rate}% rate`}
          badgeVariant="red"
        />
        <MetricCard
          label="Fraud Losses (raw)"
          value={fmtRawAmountMajor(overview.fraud_amount)}
          sub="mixed-currency sum"
          badge={`${overview.fraud_amount_pct}% of raw volume`}
          badgeVariant="red"
        />
        <MetricCard
          label="Fraud Losses (fiat GBP)"
          value={typeof overview.fraud_amount_gbp_fiat === "number" ? fmtB(overview.fraud_amount_gbp_fiat) : "—"}
          sub="ex crypto"
          badge={typeof overview.fraud_amount_pct_gbp_fiat === "number" ? `${overview.fraud_amount_pct_gbp_fiat}% of fiat GBP volume` : undefined}
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
      <Panel
        title="Volume by Transaction Type"
        description="Where operational load and fraud-labelled volume concentrate by channel."
        methodology="Stacked bars count transactions per TYPE; grey = non-fraud-labelled, black = fraud-labelled rows in the extract."
      >
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
            <Tooltip
              content={(props) => (
                <ChartTooltipFromPayload {...props} formatValue={(v) => (typeof v === "number" ? fmt(v) : String(v))} />
              )}
              cursor={{ fill: "#fafafa" }}
            />
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

      {/* Executive summary */}
      <div style={{
        marginTop: 24,
        padding: "24px 28px",
        borderRadius: 14,
        border: "1px solid #e5e5e5",
        borderLeft: "3px solid #0f0f0f",
        background: "#fafafa",
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 10 }}>
          Executive summary
        </p>
        <p style={{ fontSize: 14, color: "#171717", lineHeight: 1.75, maxWidth: 820 }}>
          <strong style={{ fontWeight: 600 }}>Assessment.</strong> Controls are strongest at customer onboarding (KYC) and comparatively
          weaker on ongoing transaction behaviour. Conversion pressure, geographic exposure in merchant-facing flows, KYC-status
          exploitation, and sustained high-volume fraud actors are directionally consistent with a material gap in{" "}
          <strong>post-onboarding behavioural monitoring</strong>.
        </p>
        <p style={{ fontSize: 14, color: "#171717", lineHeight: 1.75, maxWidth: 820, marginTop: 12, marginBottom: 0 }}>
          <strong style={{ fontWeight: 600 }}>Recommendation.</strong> Prioritise real-time, transaction-level anomaly detection layered on
          identity verification, rather than addressing each signal in isolation. That design choice closes the underlying control gap
          across the indicators above.
        </p>
      </div>
    </div>
  );
}

"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import Panel from "@/components/ui/Panel";
import PageHeader from "@/components/ui/PageHeader";
import type { GeoRisk } from "@/lib/types";

const fmt  = (n: number) => n.toLocaleString();
const fmtM = (n: number) => {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `£${(n / 1_000).toFixed(0)}K`;
  return `£${n}`;
};

/** Convert ISO 3166-1 alpha-2 code → flag emoji */
const flag = (code: string) =>
  code.toUpperCase().split("").map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join("");

const COUNTRY_NAMES: Record<string, string> = {
  GB: "United Kingdom", DE: "Germany",    PL: "Poland",      FR: "France",
  ES: "Spain",          LT: "Lithuania",  RO: "Romania",     CZ: "Czech Republic",
  NL: "Netherlands",    BE: "Belgium",    GR: "Greece",      IT: "Italy",
  JE: "Jersey",         RU: "Russia",     US: "United States", MV: "Maldives",
  CH: "Switzerland",    LV: "Latvia",     IE: "Ireland",     SK: "Slovakia",
};

const name = (code: string) => COUNTRY_NAMES[code] ?? code;

/* ── Custom Y-axis tick with flag ─────────────────────── */
const FlagTick = ({ x, y, payload }: any) => (
  <text x={x} y={y} dy={4} textAnchor="end" fontSize={13} fill="#404040">
    {flag(payload.value)} {payload.value}
  </text>
);

const ChartTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "#fff", border: "1px solid #ebebeb", borderRadius: 10,
      padding: "12px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", fontSize: 12, minWidth: 180,
    }}>
      <p style={{ fontWeight: 700, color: "#0f0f0f", marginBottom: 8, fontSize: 14 }}>
        {flag(d.country)} {name(d.country)}
      </p>
      <p style={{ color: "#737373", marginBottom: 2 }}>Fraud txns <span style={{ fontWeight: 600, color: "#0f0f0f" }}>{fmt(d.fraud)}</span></p>
      <p style={{ color: "#737373", marginBottom: 2 }}>Fraud rate <span style={{ fontWeight: 600, color: "#0f0f0f" }}>{d.rate}%</span></p>
      <p style={{ color: "#737373" }}>Fraud loss <span style={{ fontWeight: 600, color: "#0f0f0f" }}>{fmtM(d.fraud_amount)}</span></p>
    </div>
  );
};

export default function GeographicPage({ data }: { data: GeoRisk[] }) {
  const top10  = data.slice(0, 10);
  const byRate = [...data].sort((a, b) => b.rate - a.rate).slice(0, 10);

  return (
    <div style={{ padding: "48px 56px", maxWidth: 1100, margin: "0 auto" }}>
      <PageHeader
        overline="Brief 2A"
        title="Geographic Risk Exposure"
        description="Distinguishing high-volume (attack count) from high-probability (fraud rate) countries to support a nuanced global risk strategy."
      />

      {/* Callout pair */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        {[
          {
            label: "Highest Volume",
            country: top10[0]?.country,
            detail: `${fmt(top10[0]?.fraud)} fraud transactions · ${top10[0]?.rate}% rate`,
          },
          {
            label: "Highest Rate (≥50 txns)",
            country: byRate[0]?.country,
            detail: `${byRate[0]?.rate}% fraud rate · ${fmt(byRate[0]?.fraud)} total cases`,
          },
        ].map((c) => (
          <div key={c.label} style={{
            background: "#ffffff", border: "1px solid #ebebeb", borderRadius: 12, padding: "32px 32px",
          }}>
            <p style={{
              fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const,
              letterSpacing: "0.08em", color: "#a3a3a3", marginBottom: 16,
            }}>
              {c.label}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
              <span style={{ fontSize: 44, lineHeight: 1 }}>{flag(c.country ?? "")}</span>
              <div>
                <p style={{ fontSize: 28, fontWeight: 700, color: "#0f0f0f", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>
                  {c.country}
                </p>
                <p style={{ fontSize: 13, color: "#a3a3a3", fontWeight: 400 }}>{name(c.country ?? "")}</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: "#a3a3a3" }}>{c.detail}</p>
          </div>
        ))}
      </div>

      {/* Insight */}
      <div style={{
        background: "#ffffff", border: "1px solid #ebebeb", borderRadius: 12,
        padding: "24px 28px", marginBottom: 40, display: "flex", gap: 16, alignItems: "flex-start",
      }}>
        <div style={{ width: 3, flexShrink: 0, borderRadius: 99, background: "#e5e5e5", alignSelf: "stretch" }} />
        <p style={{ fontSize: 13, color: "#737373", lineHeight: 1.6 }}>
          <span style={{ fontWeight: 600, color: "#171717" }}>{flag(top10[0]?.country ?? "")} {name(top10[0]?.country ?? "")}</span>{" "}
          dominates by raw fraud volume ({fmt(top10[0]?.fraud)} cases) due to its large user base. But{" "}
          <span style={{ fontWeight: 600, color: "#171717" }}>{flag(byRate[0]?.country ?? "")} {name(byRate[0]?.country ?? "")}</span>{" "}
          is the highest-risk country by rate ({byRate[0]?.rate}%) — 1 in every{" "}
          {Math.round(100 / (byRate[0]?.rate || 1))} transactions is fraudulent.
          A global strategy must monitor both dimensions independently.
        </p>
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        <Panel title="Top 10 by Fraud Volume">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top10} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: "#a3a3a3", fontSize: 10, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="country"
                axisLine={false}
                tickLine={false}
                width={58}
                tick={<FlagTick />}
              />
              <Tooltip content={<ChartTip />} cursor={{ fill: "#fafafa" }} />
              <Bar dataKey="fraud" radius={[0, 3, 3, 0]}>
                {top10.map((e, i) => (
                  <Cell key={e.country} fill={`rgba(15,15,15,${1 - i * 0.08})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Top 10 by Fraud Rate (%)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byRate} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: "#a3a3a3", fontSize: 10, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis
                type="category"
                dataKey="country"
                axisLine={false}
                tickLine={false}
                width={58}
                tick={<FlagTick />}
              />
              <Tooltip content={<ChartTip />} cursor={{ fill: "#fafafa" }} />
              <Bar dataKey="rate" radius={[0, 3, 3, 0]}>
                {byRate.map((e, i) => (
                  <Cell key={e.country} fill={`rgba(207,19,34,${1 - i * 0.08})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Table */}
      <Panel title="Country Breakdown" noPad>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #f5f5f5" }}>
              {["Country", "Total Txns", "Fraud Txns", "Fraud Rate", "Fraud Loss"].map((h) => (
                <th key={h} style={{
                  padding: "12px 24px", textAlign: "left", fontSize: 11,
                  fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#a3a3a3",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top10.map((row, i) => (
              <tr key={row.country} style={{ borderBottom: i < top10.length - 1 ? "1px solid #fafafa" : "none" }}>
                <td style={{ padding: "14px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{flag(row.country)}</span>
                    <div>
                      <p style={{ fontWeight: 600, color: "#0f0f0f", lineHeight: 1, marginBottom: 2 }}>{row.country}</p>
                      <p style={{ fontSize: 11, color: "#a3a3a3" }}>{name(row.country)}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "14px 24px", color: "#737373" }}>{fmt(row.total)}</td>
                <td style={{ padding: "14px 24px", color: "#404040", fontWeight: 500 }}>{fmt(row.fraud)}</td>
                <td style={{ padding: "14px 24px" }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                    background: row.rate > 4 ? "#fff1f0" : row.rate > 1 ? "#fffbe6" : "#f5f5f5",
                    color: row.rate > 4 ? "#cf1322" : row.rate > 1 ? "#ad6800" : "#595959",
                  }}>
                    {row.rate}%
                  </span>
                </td>
                <td style={{ padding: "14px 24px", color: "#404040", fontWeight: 500 }}>{fmtM(row.fraud_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import SectionCard from "./SectionCard";
import type { GeoRisk } from "@/lib/types";

interface Props { data: GeoRisk[] }

const fmt  = (n: number) => n.toLocaleString();
const fmtM = (n: number) => {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `£${(n / 1_000).toFixed(0)}K`;
  return `£${n}`;
};

const Tip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8ed", borderRadius: 10, padding: "12px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", minWidth: 170 }}>
      <p style={{ fontWeight: 700, marginBottom: 6 }}>{d.country}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <p style={{ fontSize: 12, color: "#6b6b80" }}>Fraud txns: <strong style={{ color: "#e53e3e" }}>{fmt(d.fraud)}</strong></p>
        <p style={{ fontSize: 12, color: "#6b6b80" }}>Fraud rate: <strong style={{ color: "#d97706" }}>{d.rate}%</strong></p>
        <p style={{ fontSize: 12, color: "#6b6b80" }}>Fraud loss: <strong style={{ color: "#e53e3e" }}>{fmtM(d.fraud_amount)}</strong></p>
        <p style={{ fontSize: 12, color: "#6b6b80" }}>Total txns: {fmt(d.total)}</p>
      </div>
    </div>
  );
};

export default function GeographicSection({ data }: Props) {
  const top10  = data.slice(0, 10);
  const byRate = [...data].sort((a, b) => b.rate - a.rate).slice(0, 10);

  return (
    <SectionCard
      tag="Brief 2A"
      tagColor="black"
      title="Geographic Risk Exposure"
      subtitle="Distinguishing between high-volume (number of attacks) and high-probability (fraud rate) countries."
    >
      {/* Callout cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: "#fff1f1", borderRadius: 14, padding: "20px 22px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#9b1c1c", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Highest Volume
          </p>
          <p style={{ fontSize: 36, fontWeight: 800, color: "#dc2626", letterSpacing: "-0.03em", lineHeight: 1 }}>{top10[0]?.country}</p>
          <p style={{ fontSize: 13, color: "#6b6b80", marginTop: 6 }}>{fmt(top10[0]?.fraud)} fraud transactions · {top10[0]?.rate}% rate</p>
        </div>
        <div style={{ background: "#fffbeb", borderRadius: 14, padding: "20px 22px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Highest Rate (≥50 txns)
          </p>
          <p style={{ fontSize: 36, fontWeight: 800, color: "#d97706", letterSpacing: "-0.03em", lineHeight: 1 }}>{byRate[0]?.country}</p>
          <p style={{ fontSize: 13, color: "#6b6b80", marginTop: 6 }}>{byRate[0]?.rate}% fraud rate · {fmt(byRate[0]?.fraud)} attacks</p>
        </div>
      </div>

      {/* Insight */}
      <div style={{ background: "#fff1f1", border: "1px solid #fecaca", borderRadius: 12, padding: "16px 20px", display: "flex", gap: 12 }}>
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>🌍</span>
        <p style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.6 }}>
          <strong>{top10[0]?.country}</strong> is the largest fraud source <em>by volume</em> ({fmt(top10[0]?.fraud)} cases), driven by its dominant user base.
          But <strong>{byRate[0]?.country}</strong> is the most dangerous <em>by rate</em> ({byRate[0]?.rate}%) — nearly 1 in {Math.round(100 / (byRate[0]?.rate || 1))} transactions is fraudulent.
          Both dimensions require independent monitoring for a global risk strategy.
        </p>
      </div>

      {/* Two charts side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#6b6b80", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            By Fraud Volume
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={top10} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: "#9898ac", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="country" tick={{ fill: "#0a0a0f", fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="fraud" radius={[0, 6, 6, 0]}>
                {top10.map((e, i) => (
                  <Cell key={e.country} fill={i === 0 ? "#dc2626" : `rgba(220,38,38,${0.75 - i * 0.06})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#6b6b80", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            By Fraud Rate (%)
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byRate} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: "#9898ac", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="country" tick={{ fill: "#0a0a0f", fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="rate" radius={[0, 6, 6, 0]}>
                {byRate.map((e, i) => (
                  <Cell key={e.country} fill={i === 0 ? "#d97706" : `rgba(217,119,6,${0.8 - i * 0.06})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#6b6b80", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Country Breakdown
        </p>
        <div style={{ border: "1px solid #e8e8ed", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9f9fb" }}>
                {["Country", "Total Txns", "Fraud Txns", "Fraud Rate", "Fraud Loss"].map((h) => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9898ac", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {top10.map((row, i) => (
                <tr key={row.country} style={{ borderTop: "1px solid #f0f0f5", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "11px 16px", fontWeight: 700 }}>{row.country}</td>
                  <td style={{ padding: "11px 16px", color: "#6b6b80" }}>{fmt(row.total)}</td>
                  <td style={{ padding: "11px 16px", fontWeight: 600, color: "#dc2626" }}>{fmt(row.fraud)}</td>
                  <td style={{ padding: "11px 16px" }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                      background: row.rate > 4 ? "#fff1f1" : row.rate > 1 ? "#fffbeb" : "#f0fdf4",
                      color: row.rate > 4 ? "#dc2626" : row.rate > 1 ? "#d97706" : "#16a34a",
                    }}>
                      {row.rate}%
                    </span>
                  </td>
                  <td style={{ padding: "11px 16px", color: "#dc2626", fontWeight: 600 }}>{fmtM(row.fraud_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  );
}

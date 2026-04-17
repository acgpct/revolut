"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
} from "recharts";
import type { Analytics } from "@/lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt  = (n: number) => n.toLocaleString();
const fmtB = (n: number) => {
  if (n >= 1_000_000_000) return `£${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `£${(n / 1_000_000).toFixed(0)}M`;
  return `£${(n / 1_000).toFixed(0)}K`;
};

// ── shared chart tooltip ──────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10,
      padding: "10px 14px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12,
    }}>
      {label && <p style={{ fontWeight: 700, color: "#171717", marginBottom: 6 }}>{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: "#737373", marginBottom: 2 }}>
          {p.name}:{" "}
          <span style={{ fontWeight: 700, color: "#0f0f0f" }}>
            {typeof p.value === "number" && p.name?.toLowerCase().includes("rate") ? `${p.value}%` : p.value?.toLocaleString()}
          </span>
        </p>
      ))}
    </div>
  );
}

// ── slide shell ───────────────────────────────────────────────────────────────
function Slide({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "72px 96px",
      background: dark ? "#0a0a0a" : "#ffffff",
      color: dark ? "#ffffff" : "#0f0f0f",
      boxSizing: "border-box",
      position: "relative",
      overflow: "hidden",
    }}>
      {children}
    </div>
  );
}

function Tag({ children, color = "#f5f5f5", text = "#595959" }: { children: React.ReactNode; color?: string; text?: string }) {
  return (
    <span style={{
      display: "inline-block",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      padding: "4px 12px",
      borderRadius: 6,
      background: color,
      color: text,
    }}>
      {children}
    </span>
  );
}

function SlideTitle({ overline, title, sub, dark }: { overline?: string; title: string; sub?: string; dark?: boolean }) {
  return (
    <div style={{ marginBottom: 56 }}>
      {overline && (
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
          color: dark ? "rgba(255,255,255,0.4)" : "#a3a3a3", marginBottom: 16,
        }}>
          {overline}
        </p>
      )}
      <h1 style={{
        fontSize: 48, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1,
        color: dark ? "#ffffff" : "#0f0f0f", marginBottom: sub ? 16 : 0,
      }}>
        {title}
      </h1>
      {sub && (
        <p style={{ fontSize: 16, color: dark ? "rgba(255,255,255,0.5)" : "#737373", lineHeight: 1.5, maxWidth: 640 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function StatBox({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      background: "#f9f9f9",
      border: "1px solid #ebebeb",
      borderRadius: 14,
      padding: "28px 32px",
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 10 }}>
        {label}
      </p>
      <p style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, color: accent ? "#cf1322" : "#0f0f0f", marginBottom: sub ? 8 : 0 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 13, color: "#a3a3a3" }}>{sub}</p>}
    </div>
  );
}

function DarkStatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 14,
      padding: "28px 32px",
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>
        {label}
      </p>
      <p style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, color: "#ffffff", marginBottom: sub ? 8 : 0 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{sub}</p>}
    </div>
  );
}

function InsightBar({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", background: "#f9f9f9", border: "1px solid #ebebeb", borderRadius: 12, padding: "20px 24px" }}>
      <div style={{ width: 3, flexShrink: 0, borderRadius: 99, background: "#d4d4d4", alignSelf: "stretch" }} />
      <p style={{ fontSize: 14, color: "#595959", lineHeight: 1.65 }}>{children}</p>
    </div>
  );
}

// ── individual slides ─────────────────────────────────────────────────────────

function TitleSlide({ data }: { data: Analytics }) {
  const { overview } = data;
  return (
    <Slide dark>
      {/* decorative rings */}
      <div style={{ position: "absolute", right: -180, top: -180, width: 480, height: 480, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: -80, top: -80, width: 320, height: 320, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 680 }}>
        <Tag color="rgba(255,255,255,0.1)" text="rgba(255,255,255,0.6)">Revolut · Financial Crime Intelligence</Tag>
        <h1 style={{
          fontSize: 64, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05,
          color: "#ffffff", marginTop: 32, marginBottom: 24,
        }}>
          Fraud Analysis<br />&amp; Findings
        </h1>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,0.45)", lineHeight: 1.55, maxWidth: 520 }}>
          Conversion rate methodology, geographic risk exposure, KYC pattern anomalies, and top-priority fraudster targeting.
        </p>
        <div style={{ marginTop: 56, height: 1, background: "rgba(255,255,255,0.1)", maxWidth: 400 }} />
        <p style={{ marginTop: 20, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
          {fmt(overview.total_txns)} transactions · {fmt(overview.unique_users)} users · {fmtB(overview.total_amount)} volume
        </p>
      </div>
    </Slide>
  );
}

function ExecutiveSummary({ data }: { data: Analytics }) {
  const { overview, brief1, fraud_by_type } = data;
  const gap = (brief1.marketing_rate - brief1.revolut_rate).toFixed(1);

  const typeData = fraud_by_type.map((t) => ({
    name: t.type.replace("_", " ").replace("_", " "),
    Legitimate: t.total - t.fraud,
    Fraud: t.fraud,
  }));

  return (
    <Slide>
      <SlideTitle
        overline="Executive Summary"
        title="Key Findings at a Glance"
        sub="Four analytical briefs uncovering fraud exposure, conversion methodology gaps, and high-priority actors."
      />
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 28, alignItems: "start" }}>
        {/* Left: KPI grid */}
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            <StatBox label="Total Transactions" value={fmt(overview.total_txns)} sub="all types" />
            <StatBox label="Fraud Events"       value={fmt(overview.total_fraud)} sub={`${overview.fraud_rate}% rate`} accent />
            <StatBox label="Fraud Losses"       value={fmtB(overview.fraud_amount)} sub={`${overview.fraud_amount_pct}% of volume`} accent />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <StatBox label="Unique Users"       value={fmt(overview.unique_users)} sub="registered accounts" />
            <StatBox label="True Conversion"    value={`${brief1.revolut_rate}%`} sub={`vs ${brief1.marketing_rate}% marketing`} />
            <StatBox label="Conversion Gap"     value={`−${gap}pp`} sub="marketing inflation" accent />
          </div>
        </div>

        {/* Right: stacked bar chart */}
        <div style={{ background: "#f9f9f9", border: "1px solid #ebebeb", borderRadius: 14, padding: "20px 20px 14px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 14 }}>
            Volume by Transaction Type
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={typeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={2}>
              <XAxis dataKey="name" tick={{ fill: "#a3a3a3", fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a3a3a3", fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTip />} cursor={{ fill: "#f5f5f5" }} />
              <Bar dataKey="Legitimate" stackId="a" fill="#e5e5e5" />
              <Bar dataKey="Fraud"      stackId="a" fill="#0f0f0f" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: "#e5e5e5", border: "1px solid #d4d4d4" }} />
              <span style={{ fontSize: 11, color: "#a3a3a3" }}>Legitimate</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: "#0f0f0f" }} />
              <span style={{ fontSize: 11, color: "#a3a3a3" }}>Fraud</span>
            </div>
          </div>
        </div>
      </div>
    </Slide>
  );
}

function ConversionSlide({ data }: { data: Analytics }) {
  const { brief1 } = data;
  const gap = (brief1.marketing_rate - brief1.revolut_rate).toFixed(1);
  const excluded = brief1.topup_users - brief1.revolut_converted_users;

  return (
    <Slide>
      <SlideTitle
        overline="Brief 1 · Conversion Rate"
        title={`Marketing Claims ${brief1.marketing_rate}%.\nReality: ${brief1.revolut_rate}%.`}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        <div style={{ border: "1px solid #ebebeb", borderRadius: 14, padding: "40px 40px", background: "#fafafa" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 16 }}>
            Marketing Definition
          </p>
          <p style={{ fontSize: 72, fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, color: "#d4d4d4", marginBottom: 12 }}>
            {brief1.marketing_rate}%
          </p>
          <p style={{ fontSize: 13, color: "#a3a3a3", lineHeight: 1.5 }}>
            TOPUP + any spending / all users<br />(includes fraudsters & non-card txns)
          </p>
        </div>
        <div style={{ border: "2px solid #0f0f0f", borderRadius: 14, padding: "40px 40px", background: "#ffffff" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 16 }}>
            Revolut Definition
          </p>
          <p style={{ fontSize: 72, fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, color: "#0f0f0f", marginBottom: 12 }}>
            {brief1.revolut_rate}%
          </p>
          <p style={{ fontSize: 13, color: "#737373", lineHeight: 1.5 }}>
            KYC passed + ≥1 legitimate card payment<br />= revenue-positive primary account
          </p>
        </div>
      </div>
      <InsightBar>
        <strong style={{ color: "#0f0f0f" }}>{gap}pp gap:</strong> Marketing's definition counts{" "}
        <strong style={{ color: "#0f0f0f" }}>{fmt(excluded)} users</strong> who either failed KYC, are fraudsters, or made no
        card payment — generating zero interchange revenue. The correct definition requires KYC clearance and at
        least one legitimate card transaction.
      </InsightBar>
    </Slide>
  );
}

function ConversionFunnelSlide({ data }: { data: Analytics }) {
  const { brief1, fraud_by_type } = data;
  const total = brief1.unique_users;

  const funnel = [
    { label: "Registered",   value: brief1.unique_users,            pct: 100 },
    { label: "Topped Up",    value: brief1.topup_users,             pct: Math.round(brief1.topup_users / total * 100) },
    { label: "KYC Passed",   value: brief1.kyc_passed_users,        pct: Math.round(brief1.kyc_passed_users / total * 100) },
    { label: "Legit Card",   value: brief1.legit_card_users,        pct: Math.round(brief1.legit_card_users / total * 100) },
    { label: "Converted",    value: brief1.revolut_converted_users, pct: Math.round(brief1.revolut_converted_users / total * 100) },
  ];

  const rateData = [...fraud_by_type]
    .sort((a, b) => b.rate - a.rate)
    .map((t) => ({ name: t.type.replace(/_/g, " "), rate: t.rate }));

  const txnData = brief1.txn_types.map((t) => ({
    name: t.type.replace(/_/g, " ").replace("CARD PAYMENT", "Card").replace("BANK TRANSFER", "Transfer"),
    Legitimate: t.count - t.fraud,
    Fraud: t.fraud,
  }));

  return (
    <Slide>
      <SlideTitle
        overline="Brief 1 · Conversion Funnel"
        title="User Journey to Conversion"
        sub="Only users who pass KYC and make a legitimate card payment count as converted."
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
        {/* Funnel steps */}
        <div>
          {funnel.map((s, i) => (
            <div key={s.label} style={{ marginBottom: i < funnel.length - 1 ? 5 : 0 }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 18px",
                background: "#f9f9f9",
                border: "1px solid #ebebeb",
                borderRadius: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    height: 3, borderRadius: 99, background: "#0f0f0f",
                    width: `${Math.max(4, s.pct * 0.36)}px`,
                    opacity: 1 - i * 0.15,
                  }} />
                  <span style={{ fontSize: 13, color: "#404040", fontWeight: 500 }}>{s.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 17, fontWeight: 800, color: "#0f0f0f", letterSpacing: "-0.02em" }}>{fmt(s.value)}</span>
                  <span style={{ fontSize: 12, color: "#a3a3a3", fontWeight: 600 }}>{s.pct}%</span>
                </div>
              </div>
              {i < funnel.length - 1 && (
                <div style={{ display: "flex", justifyContent: "flex-start", paddingLeft: 29, paddingTop: 2, paddingBottom: 2 }}>
                  <div style={{ width: 1, height: 7, background: "#e5e5e5" }} />
                </div>
              )}
            </div>
          ))}

          {/* Volume stacked bar */}
          <div style={{ background: "#f9f9f9", border: "1px solid #ebebeb", borderRadius: 12, padding: "16px 16px 10px", marginTop: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 10 }}>
              Legitimate vs Fraud Volume
            </p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={txnData} margin={{ top: 0, right: 0, left: -22, bottom: 0 }} barGap={2}>
                <XAxis dataKey="name" tick={{ fill: "#a3a3a3", fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a3a3a3", fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "#f5f5f5" }} />
                <Bar dataKey="Legitimate" stackId="a" fill="#e5e5e5" />
                <Bar dataKey="Fraud"      stackId="a" fill="#0f0f0f" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fraud rate bar chart */}
        <div style={{ background: "#f9f9f9", border: "1px solid #ebebeb", borderRadius: 14, padding: "20px 20px 14px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 4 }}>
            Fraud Rate by Transaction Type
          </p>
          <p style={{ fontSize: 12, color: "#a3a3a3", marginBottom: 16 }}>% of transactions that are fraudulent</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rateData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: "#a3a3a3", fontSize: 10, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#404040", fontSize: 11, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={72} />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
                      <p style={{ fontWeight: 700, color: "#171717", marginBottom: 4 }}>{label}</p>
                      <p style={{ color: "#737373" }}>{payload[0].value}% fraud rate</p>
                    </div>
                  ) : null
                }
                cursor={{ fill: "#f5f5f5" }}
              />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                {rateData.map((e) => (
                  <Cell key={e.name} fill={e.rate > 5 ? "#cf1322" : e.rate > 2 ? "#e8a000" : "#0f0f0f"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 12, padding: "12px 16px", background: "#fff8f8", border: "1px solid #fde8e8", borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: "#cf1322", fontWeight: 700 }}>
              {rateData[0]?.name}: {rateData[0]?.rate}% — {(rateData[0]?.rate / (data.overview.fraud_rate || 1)).toFixed(1)}× the platform average ({data.overview.fraud_rate}%)
            </p>
          </div>
        </div>
      </div>
    </Slide>
  );
}

function GeoChartTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "12px 16px", fontSize: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", minWidth: 160 }}>
      <p style={{ fontWeight: 700, color: "#0f0f0f", marginBottom: 6 }}>{d.country}</p>
      <p style={{ color: "#737373", marginBottom: 2 }}>Fraud txns <span style={{ fontWeight: 700, color: "#0f0f0f" }}>{d.fraud?.toLocaleString()}</span></p>
      <p style={{ color: "#737373", marginBottom: 2 }}>Fraud rate <span style={{ fontWeight: 700, color: "#0f0f0f" }}>{d.rate}%</span></p>
      <p style={{ color: "#737373" }}>Loss <span style={{ fontWeight: 700, color: "#0f0f0f" }}>{fmtB(d.fraud_amount)}</span></p>
    </div>
  );
}

const geoShortLabel = (c: string) => c === "Unknown / Null" ? "N/A" : c;

function GeographicSlide({ data }: { data: Analytics }) {
  const geo = data.brief2a.geo_risk;
  const top8    = geo.slice(0, 8);
  const byRate  = [...geo].sort((a, b) => b.rate - a.rate).slice(0, 8);
  const top8C   = top8.map(r   => ({ ...r, country: geoShortLabel(r.country) }));
  const byRateC = byRate.map(r => ({ ...r, country: geoShortLabel(r.country) }));
  const highestVolume = geo[0];
  const highestRate   = byRate[0];

  return (
    <Slide>
      <SlideTitle
        overline="Brief 2A · Geographic Risk"
        title="Volume vs Rate: Two Different Threats"
        sub="High transaction volume ≠ high fraud probability. Both dimensions require independent monitoring."
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Volume side */}
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ border: "1px solid #ebebeb", borderRadius: 12, padding: "18px 20px", background: "#f9f9f9" }}>
              <Tag>Highest Volume</Tag>
              <p style={{ fontSize: 36, fontWeight: 900, color: "#0f0f0f", letterSpacing: "-0.04em", margin: "8px 0 4px", lineHeight: 1 }}>
                {highestVolume?.country}
              </p>
              <p style={{ fontSize: 12, color: "#a3a3a3" }}>{fmt(highestVolume?.fraud)} fraud txns</p>
            </div>
            <div style={{ border: "1px solid #ebebeb", borderRadius: 12, padding: "18px 20px", background: "#f9f9f9" }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 8 }}>Fraud Losses</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: "#0f0f0f", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>
                {fmtB(highestVolume?.fraud_amount)}
              </p>
              <p style={{ fontSize: 12, color: "#a3a3a3" }}>from {highestVolume?.country}</p>
            </div>
          </div>
          <div style={{ background: "#f9f9f9", border: "1px solid #ebebeb", borderRadius: 12, padding: "16px 16px 10px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 10 }}>
              Top 8 by Fraud Volume
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={top8C} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: "#a3a3a3", fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="country" tick={{ fill: "#404040", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip content={<GeoChartTip />} cursor={{ fill: "#f5f5f5" }} />
                <Bar dataKey="fraud" radius={[0, 3, 3, 0]}>
                  {top8C.map((e, i) => (
                    <Cell key={e.country} fill={`rgba(15,15,15,${1 - i * 0.09})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rate side */}
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ border: "2px solid #cf1322", borderRadius: 12, padding: "18px 20px", background: "#fff8f8" }}>
              <Tag color="#fff1f0" text="#cf1322">Highest Rate</Tag>
              <p style={{ fontSize: 36, fontWeight: 900, color: "#cf1322", letterSpacing: "-0.04em", margin: "8px 0 4px", lineHeight: 1 }}>
                {highestRate?.country}
              </p>
              <p style={{ fontSize: 12, color: "#a3a3a3" }}>{highestRate?.rate}% fraud rate</p>
            </div>
            <div style={{ border: "1px solid #fde8e8", borderRadius: 12, padding: "18px 20px", background: "#fff8f8" }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 8 }}>1 in every</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: "#cf1322", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>
                {Math.round(100 / (highestRate?.rate || 1))}
              </p>
              <p style={{ fontSize: 12, color: "#a3a3a3" }}>txns is fraudulent</p>
            </div>
          </div>
          <div style={{ background: "#f9f9f9", border: "1px solid #ebebeb", borderRadius: 12, padding: "16px 16px 10px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 10 }}>
              Top 8 by Fraud Rate (%) · ≥50 txns
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byRateC} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: "#a3a3a3", fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="country" tick={{ fill: "#404040", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip content={<GeoChartTip />} cursor={{ fill: "#f5f5f5" }} />
                <Bar dataKey="rate" radius={[0, 3, 3, 0]}>
                  {byRateC.map((e, i) => (
                    <Cell key={e.country} fill={`rgba(207,19,34,${1 - i * 0.09})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Slide>
  );
}

function KYCSlide({ data }: { data: Analytics }) {
  const { brief2b, fraud_by_type } = data;

  const txnTypes = ["CARD_PAYMENT", "TOPUP", "ATM", "BANK_TRANSFER", "P2P"];
  const shortLabels: Record<string, string> = {
    CARD_PAYMENT: "Card", TOPUP: "Top-up", ATM: "ATM", BANK_TRANSFER: "Transfer", P2P: "P2P",
  };

  const radarData = txnTypes.map((t) => ({
    type: shortLabels[t],
    Fraud:     brief2b.fraud_type_pct[t] || 0,
    Legitimate: brief2b.legit_type_pct[t]  || 0,
  }));

  const signals = [
    { label: "ATM Withdrawals",  fraud: brief2b.fraud_type_pct["ATM"] || 0,           legit: brief2b.legit_type_pct["ATM"] || 0 },
    { label: "Bank Transfers",   fraud: brief2b.fraud_type_pct["BANK_TRANSFER"] || 0, legit: brief2b.legit_type_pct["BANK_TRANSFER"] || 0 },
    { label: "Top-ups",          fraud: brief2b.fraud_type_pct["TOPUP"] || 0,         legit: brief2b.legit_type_pct["TOPUP"] || 0 },
    { label: "Card Payments",    fraud: brief2b.fraud_type_pct["CARD_PAYMENT"] || 0,  legit: brief2b.legit_type_pct["CARD_PAYMENT"] || 0 },
    { label: "P2P Transfers",    fraud: brief2b.fraud_type_pct["P2P"] || 0,           legit: brief2b.legit_type_pct["P2P"] || 0 },
  ];

  const rateBarData = [...fraud_by_type]
    .sort((a, b) => b.rate - a.rate)
    .map((t) => ({ name: t.type.replace(/_/g, " "), rate: t.rate }));

  const highestRateType = rateBarData[0];

  return (
    <Slide>
      <SlideTitle
        overline="Brief 2B · KYC Patterns"
        title="KYC Passed ≠ Legitimate"
        sub={`${fmt(brief2b.fraud_count)} fraudulent transactions from users who cleared KYC — revealing behavioural anomalies identity checks miss.`}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Left: radar + signals */}
        <div>
          <div style={{ background: "#f9f9f9", border: "1px solid #ebebeb", borderRadius: 12, padding: "16px 16px 8px", marginBottom: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 0 }}>
              Transaction Mix: Fraud vs Legitimate (%)
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e5e5" />
                <PolarAngleAxis dataKey="type" tick={{ fill: "#737373", fontSize: 11, fontFamily: "inherit" }} />
                <Radar name="Fraud"      dataKey="Fraud"      stroke="#cf1322" fill="#cf1322" fillOpacity={0.1} />
                <Radar name="Legitimate" dataKey="Legitimate" stroke="#0f0f0f" fill="#0f0f0f" fillOpacity={0.05} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#a3a3a3", paddingTop: 4 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 8 }}>
            Behavioural Signals (pp difference)
          </p>
          {signals.map((s) => {
            const diff = s.fraud - s.legit;
            const anomaly = Math.abs(diff) > 2;
            return (
              <div key={s.label} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 12px", borderRadius: 7,
                background: anomaly ? "#fff8f8" : "#f9f9f9",
                border: `1px solid ${anomaly ? "#fde8e8" : "#ebebeb"}`,
                marginBottom: 5,
              }}>
                <span style={{ fontSize: 12, color: "#404040", fontWeight: 500 }}>{s.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#cf1322" }}>F {s.fraud}%</span>
                  <span style={{ color: "#e5e5e5" }}>·</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#737373" }}>L {s.legit}%</span>
                  {anomaly && (
                    <span style={{ fontSize: 11, fontWeight: 800, color: diff > 0 ? "#cf1322" : "#737373", minWidth: 38, textAlign: "right" }}>
                      {diff > 0 ? "+" : ""}{diff.toFixed(1)}pp
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: rate bar chart + avg txn sizes */}
        <div>
          <div style={{ background: "#f9f9f9", border: "1px solid #ebebeb", borderRadius: 12, padding: "16px 16px 10px", marginBottom: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 10 }}>
              Fraud Rate by Transaction Type
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={rateBarData} margin={{ top: 4, right: 20, left: -16, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: "#a3a3a3", fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a3a3a3", fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
                        <p style={{ fontWeight: 700, color: "#171717", marginBottom: 4 }}>{label}</p>
                        <p style={{ color: "#737373" }}>{payload[0].value}% fraud rate</p>
                      </div>
                    ) : null
                  }
                  cursor={{ fill: "#f5f5f5" }}
                />
                <Bar dataKey="rate" radius={[3, 3, 0, 0]}>
                  {rateBarData.map((e) => (
                    <Cell key={e.name} fill={e.rate > 5 ? "#cf1322" : e.rate > 2 ? "#e8a000" : "#0f0f0f"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <StatBox label="Avg Fraud Txn" value={fmtB(brief2b.fraud_avg_amount)} accent />
            <StatBox label="Avg Legit Txn" value={fmtB(brief2b.legit_avg_amount)} />
          </div>

          <div style={{ padding: "12px 16px", background: "#fff8f8", border: "1px solid #fde8e8", borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: "#cf1322", fontWeight: 700 }}>
              {highestRateType?.name}: {highestRateType?.rate}% fraud rate — highest of any channel
            </p>
          </div>

          <div style={{ padding: "12px 16px", background: "#f9f9f9", border: "1px solid #ebebeb", borderRadius: 10, marginTop: 10 }}>
            <p style={{ fontSize: 12, color: "#595959" }}>
              Avg birth year — Fraud: <strong style={{ color: "#0f0f0f" }}>{brief2b.fraud_avg_birth}</strong>
              {"  ·  "}Legit: <strong style={{ color: "#0f0f0f" }}>{brief2b.legit_avg_birth}</strong>
            </p>
          </div>
        </div>
      </div>
    </Slide>
  );
}

function FraudstersSlide({ data }: { data: Analytics }) {
  const { bonus } = data;
  const top3   = bonus.top_fraudsters.slice(0, 3);
  const top1   = bonus.top_fraudsters[0];

  const TYPE_SHORT: Record<string, string> = {
    CARD_PAYMENT: "Card", TOPUP: "Top-up", ATM: "ATM", BANK_TRANSFER: "Transfer", P2P: "P2P",
  };

  const breakdownData = top1
    ? Object.entries(top1.type_breakdown).map(([type, count]) => ({
        name: TYPE_SHORT[type] || type,
        count: count as number,
      }))
    : [];

  return (
    <Slide>
      <SlideTitle
        overline={`Bonus · Top Fraudsters · Ranked from ${fmt(bonus.total_fraudsters)} actors`}
        title="Priority Targets"
        sub="Composite score: frequency (40%) + financial impact (30%) + method diversity + geographic spread."
      />
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20, alignItems: "start" }}>
        {/* Ranked list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {top3.map((f, i) => (
            <div key={f.full_id} style={{
              display: "grid",
              gridTemplateColumns: "44px 1fr auto",
              gap: 20,
              alignItems: "center",
              padding: "18px 22px",
              background: i === 0 ? "#0a0a0a" : "#f9f9f9",
              border: `1px solid ${i === 0 ? "#0a0a0a" : "#ebebeb"}`,
              borderRadius: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                border: `1px solid ${i === 0 ? "rgba(255,255,255,0.2)" : "#e5e5e5"}`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: i === 0 ? "rgba(255,255,255,0.6)" : "#a3a3a3" }}>#{i + 1}</span>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <code style={{
                    fontSize: 10, fontFamily: "monospace", padding: "2px 7px", borderRadius: 5,
                    background: i === 0 ? "rgba(255,255,255,0.1)" : "#f0f0f0",
                    color: i === 0 ? "rgba(255,255,255,0.7)" : "#404040",
                  }}>
                    {f.full_id}
                  </code>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
                    background: f.kyc === "PASSED" ? (i === 0 ? "rgba(255,200,0,0.15)" : "#fffbe6") : (i === 0 ? "rgba(255,80,80,0.15)" : "#fff1f0"),
                    color: f.kyc === "PASSED" ? "#ad6800" : "#cf1322",
                  }}>
                    KYC {f.kyc}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                  {[
                    { label: "Txns",      value: fmt(f.txns) },
                    { label: "Amount",    value: fmtB(f.amount) },
                    { label: "Methods",   value: String(f.types_used) },
                    { label: "Countries", value: String(f.countries_hit) },
                  ].map((s) => (
                    <div key={s.label}>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: i === 0 ? "rgba(255,255,255,0.35)" : "#a3a3a3", marginBottom: 3 }}>
                        {s.label}
                      </p>
                      <p style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", color: i === 0 ? "#ffffff" : "#0f0f0f" }}>
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: i === 0 ? "rgba(255,255,255,0.35)" : "#a3a3a3", marginBottom: 4 }}>Score</p>
                <p style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em", color: i === 0 ? "#ffffff" : "#0f0f0f" }}>
                  {f.score.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* #1 actor breakdown chart */}
        {top1 && (
          <div>
            <div style={{ background: "#0a0a0a", borderRadius: 14, padding: "20px 20px 14px", marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
                #1 Actor · Transaction Breakdown
              </p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 14, fontFamily: "monospace", wordBreak: "break-all" }}>{top1.full_id}</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={breakdownData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                          <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>{label}</p>
                          <p style={{ color: "#ffffff", fontWeight: 700 }}>{payload[0].value} transactions</p>
                        </div>
                      ) : null
                    }
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {breakdownData.map((_, i) => (
                      <Cell key={i} fill={`rgba(255,255,255,${0.9 - i * 0.12})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ padding: "16px 18px", background: "#0a0a0a", borderRadius: 12 }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>
                  Total Stolen
                </p>
                <p style={{ fontSize: 22, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.03em" }}>
                  {fmtB(top1.amount)}
                </p>
              </div>
              <div style={{ padding: "16px 18px", background: "#0a0a0a", borderRadius: 12 }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>
                  Countries Hit
                </p>
                <p style={{ fontSize: 22, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.03em" }}>
                  {top1.countries_hit}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Slide>
  );
}

function RecommendationsSlide({ data }: { data: Analytics }) {
  const geo     = data.brief2a.geo_risk;
  const topVol  = geo[0];
  const topRate = [...geo].sort((a,b)=>b.rate-a.rate)[0];
  const top1    = data.bonus.top_fraudsters[0];
  const atmDiff = ((data.brief2b.fraud_type_pct["ATM"]||0) - (data.brief2b.legit_type_pct["ATM"]||0)).toFixed(1);
  const btDiff  = ((data.brief2b.fraud_type_pct["BANK_TRANSFER"]||0) - (data.brief2b.legit_type_pct["BANK_TRANSFER"]||0)).toFixed(1);

  const items = [
    {
      tag: "B1",
      color: "#ebebeb",
      text: "#404040",
      headline: "Realign conversion KPIs",
      body: `Retire the ${data.brief1.marketing_rate}% marketing figure. Report ${data.brief1.revolut_rate}% as the primary metric — KYC-passed users with ≥1 legitimate card payment.`,
    },
    {
      tag: "B2A",
      color: "#ebebeb",
      text: "#404040",
      headline: "Dual-axis geographic monitoring",
      body: `Track ${topVol.country} for volume escalations (${fmt(topVol.fraud)} fraud cases) and ${topRate.country} for rate spikes (${topRate.rate}%) independently. A single fraud-count dashboard masks the ${topRate.country} risk signal.`,
    },
    {
      tag: "B2B",
      color: "#ebebeb",
      text: "#404040",
      headline: "Behavioural rules on top of KYC",
      body: `Flag unusual ATM (+${atmDiff}pp) and bank transfer (+${btDiff}pp) weighting relative to a user's card-payment baseline. Age-profile outliers warrant enhanced due diligence.`,
    },
    {
      tag: "★",
      color: "#0f0f0f",
      text: "#ffffff",
      headline: "Immediate action on top 5 actors",
      body: `${top1?.full_id?.slice(0,8) ?? "—"} alone accounts for ${fmtB(top1?.amount||0)} across ${top1?.countries_hit||0} countries — suspend pending investigation. Composite scoring should run nightly to surface emerging actors from the ${data.bonus.total_fraudsters}-strong fraud network.`,
    },
  ];

  return (
    <Slide>
      <SlideTitle
        overline="Recommendations"
        title="Four Actions to Take Now"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {items.map((r) => (
          <div key={r.tag} style={{
            border: "1px solid #ebebeb",
            borderRadius: 14,
            padding: "28px 28px",
            background: "#ffffff",
            position: "relative",
          }}>
            <div style={{ marginBottom: 14 }}>
              <Tag color={r.color} text={r.text}>{r.tag}</Tag>
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#0f0f0f", marginBottom: 8, letterSpacing: "-0.01em" }}>
              {r.headline}
            </p>
            <p style={{ fontSize: 13, color: "#737373", lineHeight: 1.6 }}>{r.body}</p>
          </div>
        ))}
      </div>
    </Slide>
  );
}

function EndSlide({ data }: { data: Analytics }) {
  const { overview } = data;
  return (
    <Slide dark>
      <div style={{ position: "absolute", left: -200, bottom: -200, width: 480, height: 480, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: -80, bottom: -80, width: 300, height: 300, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 560 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 24 }}>
          Revolut · Financial Crime Intelligence
        </p>
        <h1 style={{ fontSize: 56, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, color: "#ffffff", marginBottom: 24 }}>
          Thank you.
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", lineHeight: 1.55 }}>
          Full interactive dashboard available at the analysis tool.
          Data: {fmt(overview.total_txns)} transactions, {fmt(overview.unique_users)} users, {fmtB(overview.total_amount)} volume.
        </p>
      </div>
    </Slide>
  );
}

// ── slide registry ────────────────────────────────────────────────────────────
function buildSlides(data: Analytics) {
  return [
    { id: "title",         label: "Title",            render: () => <TitleSlide data={data} /> },
    { id: "exec",          label: "Executive Summary", render: () => <ExecutiveSummary data={data} /> },
    { id: "conversion",    label: "Conversion Rate",   render: () => <ConversionSlide data={data} /> },
    { id: "funnel",        label: "Conversion Funnel", render: () => <ConversionFunnelSlide data={data} /> },
    { id: "geo",           label: "Geographic Risk",   render: () => <GeographicSlide data={data} /> },
    { id: "kyc",           label: "KYC Patterns",      render: () => <KYCSlide data={data} /> },
    { id: "fraudsters",    label: "Top Fraudsters",    render: () => <FraudstersSlide data={data} /> },
    { id: "recs",          label: "Recommendations",   render: () => <RecommendationsSlide data={data} /> },
    { id: "end",           label: "End",               render: () => <EndSlide data={data} /> },
  ];
}

// ── main presenter ────────────────────────────────────────────────────────────
export default function SlidesPage() {
  const [analytics, setAnalytics]   = useState<Analytics | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [current,   setCurrent]     = useState(0);
  const [showNav,   setShowNav]     = useState(true);

  useEffect(() => {
    fetch("/analytics.json")
      .then(r => r.json())
      .then((d: Analytics) => { setAnalytics(d); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);

  const slides = analytics ? buildSlides(analytics) : [];
  const total  = slides.length;

  const goNext = useCallback(() => setCurrent(c => Math.min(c + 1, total - 1)), [total]);
  const goPrev = useCallback(() => setCurrent(c => Math.max(c - 1, 0)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")                    { e.preventDefault(); goPrev(); }
      if (e.key === "f" || e.key === "F") document.documentElement.requestFullscreen?.();
      if (e.key === "Escape") setShowNav(v => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0a" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0a" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>No data found. Please upload a dataset first.</p>
      </div>
    );
  }

  const slide = slides[current];

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#111111", position: "relative" }}>

      {/* Slide frame */}
      <div style={{ width: "100%", height: "100%", position: "relative" }}>
        {slide.render()}
      </div>

      {/* Nav overlay */}
      {showNav && (
        <>
          {/* Prev / Next click zones */}
          <button
            onClick={goPrev}
            disabled={current === 0}
            style={{
              position: "fixed", left: 0, top: 0, width: "15%", height: "100%",
              background: "transparent", border: "none", cursor: current === 0 ? "default" : "pointer",
              zIndex: 50,
            }}
          />
          <button
            onClick={goNext}
            disabled={current === total - 1}
            style={{
              position: "fixed", right: 0, top: 0, width: "15%", height: "100%",
              background: "transparent", border: "none", cursor: current === total - 1 ? "default" : "pointer",
              zIndex: 50,
            }}
          />

          {/* Bottom bar */}
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 32px",
            background: "rgba(10,10,10,0.85)",
            backdropFilter: "blur(12px)",
            zIndex: 100,
          }}>
            {/* Dot nav */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setCurrent(i)}
                  title={s.label}
                  style={{
                    width: i === current ? 24 : 6,
                    height: 6,
                    borderRadius: 99,
                    border: "none",
                    background: i === current ? "#ffffff" : "rgba(255,255,255,0.25)",
                    cursor: "pointer",
                    transition: "all 200ms ease",
                    padding: 0,
                  }}
                />
              ))}
            </div>

            {/* Counter + label */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                {slide.label}
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
                {current + 1} / {total}
              </span>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={goPrev}
                disabled={current === 0}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)", color: current === 0 ? "rgba(255,255,255,0.2)" : "#ffffff",
                  fontSize: 16, cursor: current === 0 ? "default" : "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                ‹
              </button>
              <button
                onClick={goNext}
                disabled={current === total - 1}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)", color: current === total - 1 ? "rgba(255,255,255,0.2)" : "#ffffff",
                  fontSize: 16, cursor: current === total - 1 ? "default" : "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                ›
              </button>
              <button
                onClick={() => document.documentElement.requestFullscreen?.()}
                title="Fullscreen (F)"
                style={{
                  width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)",
                  fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </button>
              <a
                href="/"
                style={{
                  fontSize: 12, color: "rgba(255,255,255,0.35)", textDecoration: "none",
                  padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                ← Dashboard
              </a>
            </div>
          </div>

          {/* Keyboard hint */}
          <div style={{
            position: "fixed", bottom: 66, left: "50%", transform: "translateX(-50%)",
            fontSize: 11, color: "rgba(255,255,255,0.15)", pointerEvents: "none", letterSpacing: "0.05em",
          }}>
            ← → Arrow keys · Space · F fullscreen · Esc toggle UI
          </div>
        </>
      )}
    </div>
  );
}

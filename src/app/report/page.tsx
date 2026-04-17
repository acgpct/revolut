"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
  ResponsiveContainer,
} from "recharts";
import type { Analytics } from "@/lib/types";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt  = (n: number) => n.toLocaleString();
const fmtM = (n: number) => {
  if (n >= 1_000_000_000) return `£${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `£${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `£${(n / 1_000).toFixed(0)}K`;
  return `£${n}`;
};

// ── tokens ────────────────────────────────────────────────────────────────────
const INK    = "#0f0f0f";
const MUTED  = "#5a5a5a";
const SUBTLE = "#9a9a9a";
const RULE   = "#e8e8e8";
const RED    = "#cc1320";
const AMBER  = "#ad6800";
const WHITE  = "#ffffff";

// ── shared tooltip ────────────────────────────────────────────────────────────
function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: WHITE, border: `1px solid ${RULE}`, borderRadius: 6, padding: "6px 10px", fontSize: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      {label && <p style={{ fontWeight: 700, color: INK, marginBottom: 3 }}>{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: MUTED }}>
          {p.name}: <span style={{ fontWeight: 700, color: INK }}>{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  );
}

function GeoTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: WHITE, border: `1px solid ${RULE}`, borderRadius: 6, padding: "6px 10px", fontSize: 10 }}>
      <p style={{ fontWeight: 700, color: INK, marginBottom: 3 }}>{d.country}</p>
      <p style={{ color: MUTED }}>Fraud txns: <b>{d.fraud?.toLocaleString()}</b></p>
      <p style={{ color: MUTED }}>Rate: <b>{d.rate}%</b></p>
    </div>
  );
}

// ── design primitives ─────────────────────────────────────────────────────────
const OL = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: SUBTLE, marginBottom: 5 }}>{children}</p>
);

const Body = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <p style={{ fontSize: 9.5, color: MUTED, lineHeight: 1.7, ...style }}>{children}</p>
);

// KPI: no card — just a number with a top rule
function Kpi({ label, value, sub, red }: { label: string; value: string; sub?: string; red?: boolean }) {
  return (
    <div style={{ borderTop: `1.5px solid ${red ? RED : RULE}`, paddingTop: 8 }}>
      <p style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: SUBTLE, marginBottom: 5 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", color: red ? RED : INK, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 8, color: SUBTLE, marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

// Insight: left accent rule, no background
function Insight({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ paddingLeft: 14, borderLeft: `2px solid ${RULE}` }}>
      <Body>{children}</Body>
    </div>
  );
}

// Section header: overline + title + thin rule below
function SecHead({ overline, title, desc }: { overline: string; title: string; desc?: string }) {
  return (
    <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${RULE}` }}>
      <OL>{overline}</OL>
      <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: INK, lineHeight: 1.1, marginBottom: desc ? 5 : 0 }}>{title}</h2>
      {desc && <Body style={{ maxWidth: 580 }}>{desc}</Body>}
    </div>
  );
}

// Chart label
const ChartLabel = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: SUBTLE, marginBottom: 8 }}>{children}</p>
);

// ── page shells ───────────────────────────────────────────────────────────────
function Page({ children, bg }: { children: React.ReactNode; bg?: string }) {
  return (
    <div className="report-page" style={{
      width: "210mm", height: "297mm", overflow: "hidden",
      background: bg ?? WHITE, position: "relative", boxSizing: "border-box",
    }}>
      {children}
    </div>
  );
}

function ContentPage({ children }: { children: React.ReactNode }) {
  return (
    <Page>
      <div style={{ padding: "13mm 15mm 11mm", height: "100%", boxSizing: "border-box", position: "relative" }}>
        {children}
      </div>
    </Page>
  );
}

function Footer({ n, total }: { n: number; total: number }) {
  return (
    <div style={{
      position: "absolute", bottom: "8mm", left: "15mm", right: "15mm",
      display: "flex", justifyContent: "space-between",
      borderTop: `1px solid ${RULE}`, paddingTop: 6,
    }}>
      <p style={{ fontSize: 7.5, color: SUBTLE }}>Revolut Financial Crime Intelligence · Confidential</p>
      <p style={{ fontSize: 7.5, color: SUBTLE }}>{n} / {total}</p>
    </div>
  );
}

const TOTAL = 8;

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 1 — TITLE ONLY (full black)
// ═══════════════════════════════════════════════════════════════════════════════
function TitlePage() {
  return (
    <Page bg={INK}>
      <div style={{
        width: "100%", height: "100%", boxSizing: "border-box",
        background: INK, display: "flex", flexDirection: "column",
        justifyContent: "flex-end", padding: "0 16mm 22mm",
      }}>
        <p style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: 24 }}>
          Revolut · Financial Crime Intelligence · Home Task
        </p>
        <h1 style={{ fontSize: 52, fontWeight: 900, letterSpacing: "-0.04em", color: WHITE, lineHeight: 1.02, marginBottom: 18 }}>
          Fraud Analysis<br />& Findings Report
        </h1>
        <div style={{ width: 48, height: 1, background: "rgba(255,255,255,0.15)", marginBottom: 18 }} />
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.36)", lineHeight: 1.65, maxWidth: 420 }}>
          Conversion rate methodology · Geographic risk ·<br />KYC pattern anomalies · Priority fraudster targeting
        </p>
      </div>
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 2 — KEY NUMBERS + CONTENTS
// ═══════════════════════════════════════════════════════════════════════════════
function CoverData({ d }: { d: Analytics }) {
  const { overview } = d;
  return (
    <Page>
      <div style={{
        width: "100%", height: "100%", boxSizing: "border-box",
        background: WHITE, display: "flex", flexDirection: "column",
        padding: "20mm 16mm 14mm",
      }}>
        {/* Key numbers */}
        <p style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: MUTED, marginBottom: 16 }}>
          Dataset at a Glance
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 0", marginBottom: 32 }}>
          {[
            { l: "Transactions Analysed", v: fmt(overview.total_txns),     sub: "across all transaction types" },
            { l: "Unique Users",           v: fmt(overview.unique_users),   sub: "registered accounts" },
            { l: "Total Volume",           v: fmtM(overview.total_amount),  sub: "total transaction value" },
            { l: "Fraud Events",           v: fmt(overview.total_fraud),    sub: `${overview.fraud_rate}% fraud rate` },
            { l: "Fraud Losses",           v: fmtM(overview.fraud_amount),  sub: `${overview.fraud_amount_pct}% of total volume` },
            { l: "Unique Fraud Actors",    v: "299",                        sub: "composite-scored actors" },
          ].map((k, i) => (
            <div key={k.l} style={{
              paddingTop: 14, paddingBottom: 14,
              paddingRight: i % 2 === 0 ? 20 : 0,
              borderTop: `1px solid ${RULE}`,
              borderRight: i % 2 === 0 ? `1px solid ${RULE}` : "none",
            }}>
              <p style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, marginBottom: 6 }}>{k.l}</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: INK, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>{k.v}</p>
              <p style={{ fontSize: 8, color: SUBTLE }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Contents */}
        <p style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>
          Contents
        </p>
        {[
          { n: "1", t: "Executive Summary",                s: "Key findings at a glance" },
          { n: "2", t: "Brief 1 — App Conversion Rate",    s: "Methodology gap: 79.72% vs 65.62%" },
          { n: "3", t: "Brief 2A — Geographic Risk",       s: "Volume vs rate: two independent threats" },
          { n: "4", t: "Brief 2B — KYC-Passed Fraudsters", s: "Behavioural anomalies identity checks miss" },
          { n: "5", t: "Bonus — Top Fraudster Ranking",    s: "Composite scoring across 299 actors" },
          { n: "6", t: "Recommendations",                  s: "Four actions linked directly to findings" },
        ].map((t) => (
          <div key={t.n} style={{ display: "flex", gap: 14, padding: "9px 0", borderBottom: `1px solid ${RULE}`, alignItems: "baseline" }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: MUTED, minWidth: 14 }}>{t.n}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: INK }}>{t.t}</span>
            <span style={{ fontSize: 9, color: SUBTLE }}>— {t.s}</span>
          </div>
        ))}

        <div style={{ marginTop: "auto", borderTop: `1px solid ${RULE}`, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
          <p style={{ fontSize: 7.5, color: SUBTLE }}>Revolut Financial Crime Intelligence · Confidential</p>
          <p style={{ fontSize: 7.5, color: SUBTLE }}>2 / {TOTAL}</p>
        </div>
      </div>
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 2 — EXECUTIVE SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════
function ExecSummary({ d }: { d: Analytics }) {
  const { overview, brief1, fraud_by_type } = d;
  const gap = (brief1.marketing_rate - brief1.revolut_rate).toFixed(1);

  const typeData = fraud_by_type.map((t) => ({
    name: t.type.replace("CARD_PAYMENT","Card").replace("BANK_TRANSFER","Transfer").replace(/_/g," "),
    Legitimate: t.total - t.fraud,
    Fraud: t.fraud,
  }));

  const findings = [
    { n:"1", h:"Conversion gap of 14.1pp", b:`Marketing's ${brief1.marketing_rate}% counts fraudsters and non-card transactions. The correct rate — KYC-passed + ≥1 legitimate card payment — is ${brief1.revolut_rate}%.` },
    { n:"2", h:"Geographic risk is two-dimensional", b:"GB leads by volume (13,088 cases, £382M). DE carries the highest fraud rate (5.64%) — 1 in 18 transactions. A single axis hides one threat." },
    { n:"3", h:"KYC clearance ≠ legitimacy", b:`${fmt(d.brief2b.fraud_count)} fraud transactions came from KYC-passed users, over-indexing on ATM (+9.8pp) and bank transfers (+6.8pp).` },
    { n:"4", h:"One actor: £61M across 12 countries", b:"dc283b17 executed 1,029 transactions across all 5 channels. Risk score 18,768 — 4× the second-ranked actor." },
  ];

  return (
    <ContentPage>
      <SecHead overline="Section 1" title="Executive Summary" desc="Four analytical briefs surface distinct fraud risks across conversion methodology, geography, identity verification, and actor behaviour." />

      {/* 6 KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 20px", marginBottom: 18 }}>
        <Kpi label="Total Transactions" value={fmt(overview.total_txns)} sub="all transaction types" />
        <Kpi label="Fraud Events"       value={fmt(overview.total_fraud)} sub={`${overview.fraud_rate}% fraud rate`} red />
        <Kpi label="Fraud Losses"       value={fmtM(overview.fraud_amount)} sub={`${overview.fraud_amount_pct}% of volume`} red />
        <div style={{ marginTop: 14 }}><Kpi label="Unique Users"     value={fmt(overview.unique_users)} sub="registered accounts" /></div>
        <div style={{ marginTop: 14 }}><Kpi label="True Conversion"  value={`${brief1.revolut_rate}%`} sub={`vs ${brief1.marketing_rate}% marketing`} /></div>
        <div style={{ marginTop: 14 }}><Kpi label="Conversion Gap"   value={`−${gap}pp`} sub="methodology inflation" red /></div>
      </div>

      {/* Chart */}
      <div style={{ marginBottom: 16 }}>
        <ChartLabel>Figure 1 — Transaction Volume by Type: Legitimate vs Fraud</ChartLabel>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={typeData} margin={{ top: 0, right: 0, left: -22, bottom: 0 }} barGap={2}>
            <XAxis dataKey="name" tick={{ fill: SUBTLE, fontSize: 8, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: SUBTLE, fontSize: 8, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<Tip />} cursor={{ fill: "#f8f8f8" }} />
            <Bar dataKey="Legitimate" stackId="a" fill="#e0e0e0" />
            <Bar dataKey="Fraud"      stackId="a" fill={INK} radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: "#e0e0e0", border: `1px solid ${RULE}` }} /><span style={{ fontSize: 8, color: SUBTLE }}>Legitimate</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: INK }} /><span style={{ fontSize: 8, color: SUBTLE }}>Fraud</span></div>
        </div>
      </div>

      {/* Findings */}
      <p style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: SUBTLE, marginBottom: 10 }}>Key Findings</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {findings.map((f, i) => (
          <div key={f.n} style={{ display: "flex", gap: 14, paddingTop: 10, paddingBottom: 10, borderBottom: `1px solid ${RULE}` }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: RULE, minWidth: 16, lineHeight: 1.5 }}>{f.n}</span>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: INK, marginBottom: 2 }}>{f.h}</p>
              <Body>{f.b}</Body>
            </div>
          </div>
        ))}
      </div>
      <Footer n={3} total={TOTAL} />
    </ContentPage>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 3 — CONVERSION RATE
// ═══════════════════════════════════════════════════════════════════════════════
function ConversionRate({ d }: { d: Analytics }) {
  const { brief1, fraud_by_type } = d;
  const gap      = (brief1.marketing_rate - brief1.revolut_rate).toFixed(1);
  const excluded = fmt(brief1.topup_users - brief1.revolut_converted_users);
  const total    = brief1.unique_users;

  const funnel = [
    { l: "Registered Users",         v: brief1.unique_users,            p: 100 },
    { l: "Topped Up",                v: brief1.topup_users,             p: Math.round(brief1.topup_users/total*100) },
    { l: "KYC Passed",               v: brief1.kyc_passed_users,        p: Math.round(brief1.kyc_passed_users/total*100) },
    { l: "Legitimate Card Payment",  v: brief1.legit_card_users,        p: Math.round(brief1.legit_card_users/total*100) },
    { l: "Revolut Converted (true)", v: brief1.revolut_converted_users, p: Math.round(brief1.revolut_converted_users/total*100) },
  ];

  const rateData = [...fraud_by_type].sort((a,b)=>b.rate-a.rate).map(t => ({
    name: t.type.replace("CARD_PAYMENT","Card Pay.").replace("BANK_TRANSFER","Transfer").replace(/_/g," "),
    rate: t.rate,
  }));

  return (
    <ContentPage>
      <SecHead overline="Section 2 — Brief 1" title="App Conversion Rate" desc="Marketing overstates conversion by inflating the numerator with fraudsters and non-card transactions. The only meaningful signal is KYC clearance + a legitimate card payment." />

      {/* The big comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 14 }}>
        <div style={{ borderTop: `1.5px solid ${RULE}`, paddingTop: 10 }}>
          <OL>Marketing Definition · Incorrect</OL>
          <p style={{ fontSize: 54, fontWeight: 900, letterSpacing: "-0.05em", color: "#d0d0d0", lineHeight: 1, marginBottom: 6 }}>{brief1.marketing_rate}%</p>
          <Body>TOPUP + any spending / all users — includes fraudsters, ATM, P2P and bank transfers that generate no interchange revenue.</Body>
        </div>
        <div style={{ borderTop: `1.5px solid ${INK}`, paddingTop: 10 }}>
          <OL>Revolut Definition · Correct</OL>
          <p style={{ fontSize: 54, fontWeight: 900, letterSpacing: "-0.05em", color: INK, lineHeight: 1, marginBottom: 6 }}>{brief1.revolut_rate}%</p>
          <Body>KYC-passed + ≥1 legitimate card payment — the only transaction type generating interchange revenue and signalling a primary account relationship.</Body>
        </div>
      </div>

      <Insight>
        <strong style={{ color: INK }}>The {gap}pp gap is structural.</strong> Marketing's definition counts <strong style={{ color: INK }}>{excluded} users</strong> generating zero interchange revenue. Without a date column in the dataset no 30-day window can be applied, but the directional impact is clear.
      </Insight>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 14 }}>
        {/* Funnel */}
        <div>
          <ChartLabel>Figure 2 — User Conversion Funnel</ChartLabel>
          {funnel.map((s, i) => (
            <div key={s.l}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 7, paddingBottom: 7, borderBottom: `1px solid ${RULE}`, opacity: 1 - i * 0.12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: Math.max(3, s.p * 0.28), height: 2, background: INK, borderRadius: 99, opacity: 1 - i * 0.1 }} />
                  <span style={{ fontSize: 8.5, color: MUTED }}>{s.l}</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: INK, letterSpacing: "-0.02em" }}>{fmt(s.v)}</span>
                  <span style={{ fontSize: 8, color: SUBTLE }}>{s.p}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Rate chart */}
        <div>
          <ChartLabel>Figure 3 — Fraud Rate by Transaction Type (%)</ChartLabel>
          <ResponsiveContainer width="100%" height={148}>
            <BarChart data={rateData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: SUBTLE, fontSize: 8, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fill: MUTED, fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={58} />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                <div style={{ background:WHITE, border:`1px solid ${RULE}`, borderRadius:6, padding:"6px 10px", fontSize:10 }}>
                  <p style={{ fontWeight:700, color:INK, marginBottom:2 }}>{label}</p>
                  <p style={{ color:MUTED }}>{payload[0].value}% fraud rate</p>
                </div>
              ) : null} cursor={{ fill:"#f8f8f8" }} />
              <Bar dataKey="rate" radius={[0,3,3,0]}>
                {rateData.map(e => <Cell key={e.name} fill={e.rate > 5 ? RED : e.rate > 2 ? "#e8a000" : INK} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 8.5, fontWeight: 700, color: RED, borderTop: `1px solid #fdd`, paddingTop: 6, marginTop: 4 }}>
            Bank Transfer: 7.76% — 5× the platform average ({d.overview.fraud_rate}%)
          </p>
        </div>
      </div>
      <Footer n={4} total={TOTAL} />
    </ContentPage>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 4 — GEOGRAPHIC RISK
// ═══════════════════════════════════════════════════════════════════════════════
function GeographicRisk({ d }: { d: Analytics }) {
  const geo    = d.brief2a.geo_risk;
  const top8   = geo.slice(0, 8);
  const byRate = [...geo].sort((a,b)=>b.rate-a.rate).slice(0, 8);
  const hv = geo[0], hr = byRate[0];

  return (
    <ContentPage>
      <SecHead overline="Section 3 — Brief 2A" title="Geographic Risk Exposure" desc="Fraud risk has two dimensions: attack count (volume) and attack probability (rate). Conflating them leads to under-investment in high-rate markets." />

      {/* 4 KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 18px", marginBottom: 16 }}>
        <Kpi label="Highest Volume"  value={hv.country} sub={`${fmt(hv.fraud)} fraud txns`} />
        <Kpi label="Volume Losses"   value={fmtM(hv.fraud_amount)} sub={`${hv.rate}% rate`} red />
        <Kpi label="Highest Rate"    value={hr.country} sub={`${hr.rate}% of all txns`} red />
        <Kpi label="1 in every"      value={`${Math.round(100/(hr.rate||1))}`} sub="transactions is fraudulent" red />
      </div>

      {/* Dual bar charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 14 }}>
        <div>
          <ChartLabel>Figure 4 — Top 8 by Fraud Volume</ChartLabel>
          <ResponsiveContainer width="100%" height={192}>
            <BarChart data={top8} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: SUBTLE, fontSize: 8, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="country" tick={{ fill: MUTED, fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip content={<GeoTip />} cursor={{ fill: "#f8f8f8" }} />
              <Bar dataKey="fraud" radius={[0,3,3,0]}>
                {top8.map((e,i) => <Cell key={e.country} fill={`rgba(15,15,15,${1-i*0.09})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <ChartLabel>Figure 5 — Top 8 by Fraud Rate (%)</ChartLabel>
          <ResponsiveContainer width="100%" height={192}>
            <BarChart data={byRate} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: SUBTLE, fontSize: 8, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="country" tick={{ fill: MUTED, fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip content={<GeoTip />} cursor={{ fill: "#f8f8f8" }} />
              <Bar dataKey="rate" radius={[0,3,3,0]}>
                {byRate.map((e,i) => <Cell key={e.country} fill={`rgba(204,19,32,${1-i*0.09})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Country table */}
      <table style={{ width: "100%", fontSize: 8.5, borderCollapse: "collapse", marginBottom: 4 }}>
        <thead>
          <tr style={{ borderBottom: `1.5px solid ${INK}` }}>
            {["Country","Total Txns","Fraud Txns","Rate","Fraud Loss"].map(h => (
              <th key={h} style={{ padding: "4px 8px", textAlign: "left", fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: SUBTLE }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {top8.map((row) => (
            <tr key={row.country} style={{ borderBottom: `1px solid ${RULE}` }}>
              <td style={{ padding: "5px 8px", fontWeight: 700, color: INK }}>
                {row.country}
                {row.country === "Unknown / Null" && <sup style={{ fontSize: 6, color: SUBTLE, marginLeft: 2 }}>†</sup>}
              </td>
              <td style={{ padding: "5px 8px", color: MUTED }}>{fmt(row.total)}</td>
              <td style={{ padding: "5px 8px", color: MUTED }}>{fmt(row.fraud)}</td>
              <td style={{ padding: "5px 8px" }}>
                <span style={{ fontSize: 7.5, fontWeight: 700, color: row.rate > 4 ? RED : row.rate > 1 ? AMBER : SUBTLE }}>
                  {row.rate}%
                </span>
              </td>
              <td style={{ padding: "5px 8px", color: MUTED }}>{fmtM(row.fraud_amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {top8.some(r => r.country === "Unknown / Null") && (
        <p style={{ fontSize: 7, color: SUBTLE, marginBottom: 8, paddingLeft: 2 }}>
          <sup>†</sup> Transactions where <code>MERCHANT_COUNTRY</code> was not recorded in the source data.
        </p>
      )}

      <Insight>
        <strong style={{ color: INK }}>GB vs DE requires a dual-axis model.</strong> GB accounts for 90% of fraud by volume (£382M lost) — operational priority. DE's 5.64% rate signals a structurally different fraud vector requiring separate controls.
      </Insight>
      <Footer n={5} total={TOTAL} />
    </ContentPage>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 5 — KYC PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════
function KYCPatterns({ d }: { d: Analytics }) {
  const { brief2b, fraud_by_type } = d;

  const txnTypes = ["CARD_PAYMENT","TOPUP","ATM","BANK_TRANSFER","P2P"];
  const shortL: Record<string,string> = { CARD_PAYMENT:"Card", TOPUP:"Top-up", ATM:"ATM", BANK_TRANSFER:"Transfer", P2P:"P2P" };

  const radarData = txnTypes.map(t => ({
    type: shortL[t],
    Fraud:      brief2b.fraud_type_pct[t] || 0,
    Legitimate: brief2b.legit_type_pct[t] || 0,
  }));

  const rateData = [...fraud_by_type].sort((a,b)=>b.rate-a.rate).map(t => ({
    name: t.type.replace("CARD_PAYMENT","Card Pay.").replace("BANK_TRANSFER","Transfer").replace(/_/g," "),
    rate: t.rate,
  }));

  const signals = [
    { l:"ATM Withdrawals",  f:brief2b.fraud_type_pct["ATM"]||0,           lg:brief2b.legit_type_pct["ATM"]||0 },
    { l:"Bank Transfers",   f:brief2b.fraud_type_pct["BANK_TRANSFER"]||0, lg:brief2b.legit_type_pct["BANK_TRANSFER"]||0 },
    { l:"Top-ups",          f:brief2b.fraud_type_pct["TOPUP"]||0,         lg:brief2b.legit_type_pct["TOPUP"]||0 },
    { l:"Card Payments",    f:brief2b.fraud_type_pct["CARD_PAYMENT"]||0,  lg:brief2b.legit_type_pct["CARD_PAYMENT"]||0 },
    { l:"P2P Transfers",    f:brief2b.fraud_type_pct["P2P"]||0,           lg:brief2b.legit_type_pct["P2P"]||0 },
  ];

  return (
    <ContentPage>
      <SecHead overline="Section 4 — Brief 2B" title="KYC-Passed Fraudsters" desc={`${fmt(brief2b.fraud_count)} fraudulent transactions from KYC-cleared users reveal the limits of identity-only verification.`} />

      {/* 3 KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 20px", marginBottom: 14 }}>
        <Kpi label="KYC-Passed Fraud Txns"  value={fmt(brief2b.fraud_count)} red />
        <Kpi label="Avg Fraud Transaction"   value={fmtM(brief2b.fraud_avg_amount)} red />
        <Kpi label="Avg Legit Transaction"   value={fmtM(brief2b.legit_avg_amount)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 12 }}>
        {/* Radar */}
        <div>
          <ChartLabel>Figure 6 — Transaction Mix: Fraud vs Legitimate (%)</ChartLabel>
          <ResponsiveContainer width="100%" height={170}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={RULE} />
              <PolarAngleAxis dataKey="type" tick={{ fill: MUTED, fontSize: 9, fontFamily: "inherit" }} />
              <Radar name="Fraud"      dataKey="Fraud"      stroke={RED}  fill={RED}  fillOpacity={0.1} />
              <Radar name="Legitimate" dataKey="Legitimate" stroke={INK}  fill={INK}  fillOpacity={0.05} />
              <Legend wrapperStyle={{ fontSize: 9, color: SUBTLE, paddingTop: 2 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Rate bar */}
        <div>
          <ChartLabel>Figure 7 — Fraud Rate by Channel (%)</ChartLabel>
          <ResponsiveContainer width="100%" height={145}>
            <BarChart data={rateData} margin={{ top: 2, right: 16, left: -16, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: SUBTLE, fontSize: 8, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: SUBTLE, fontSize: 8, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                <div style={{ background:WHITE, border:`1px solid ${RULE}`, borderRadius:6, padding:"5px 8px", fontSize:10 }}>
                  <p style={{ fontWeight:700, color:INK, marginBottom:2 }}>{label}</p>
                  <p style={{ color:MUTED }}>{payload[0].value}% fraud rate</p>
                </div>
              ) : null} cursor={{ fill:"#f8f8f8" }} />
              <Bar dataKey="rate" radius={[3,3,0,0]}>
                {rateData.map(e => <Cell key={e.name} fill={e.rate>5?RED:e.rate>2?"#e8a000":INK} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 8.5, fontWeight: 700, color: RED, borderTop: `1px solid #fdd`, paddingTop: 5 }}>
            Bank Transfer: 7.76% — highest of any channel
          </p>
        </div>
      </div>

      {/* Signals table */}
      <p style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: SUBTLE, marginBottom: 6 }}>
        Table 1 — Behavioural Signals: pp Deviation from Legitimate Baseline
      </p>
      <table style={{ width: "100%", fontSize: 8.5, borderCollapse: "collapse", marginBottom: 10 }}>
        <thead>
          <tr style={{ borderBottom: `1.5px solid ${INK}` }}>
            {["Signal","Fraud (%)","Legit (%)","Diff (pp)","Anomalous"].map(h => (
              <th key={h} style={{ padding: "3px 8px", textAlign: "left", fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: SUBTLE }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {signals.map((s, i) => {
            const diff = s.f - s.lg;
            const anom = Math.abs(diff) > 2;
            return (
              <tr key={s.l} style={{ borderBottom: `1px solid ${RULE}` }}>
                <td style={{ padding: "5px 8px", fontWeight: 600, color: INK }}>{s.l}</td>
                <td style={{ padding: "5px 8px", fontWeight: 700, color: RED }}>{s.f}%</td>
                <td style={{ padding: "5px 8px", color: MUTED }}>{s.lg}%</td>
                <td style={{ padding: "5px 8px", fontWeight: 700, color: diff > 0 ? RED : MUTED }}>{diff>0?"+":""}{diff.toFixed(1)}pp</td>
                <td style={{ padding: "5px 8px" }}>
                  {anom ? <span style={{ fontSize: 7.5, fontWeight: 700, color: RED }}>● Yes</span>
                        : <span style={{ fontSize: 7.5, color: SUBTLE }}>No</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Insight>
        <strong style={{ color: INK }}>Fraudsters leave a detectable footprint.</strong> They over-index on ATM (+9.8pp) and bank transfers (+6.8pp) while under-indexing on card payments (−18.2pp). Avg birth year: Fraud {brief2b.fraud_avg_birth} · Legit {brief2b.legit_avg_birth}. Layering behavioural rules on KYC would surface these actors before fraud accumulates.
      </Insight>
      <Footer n={6} total={TOTAL} />
    </ContentPage>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 6 — TOP FRAUDSTERS
// ═══════════════════════════════════════════════════════════════════════════════
function TopFraudsters({ d }: { d: Analytics }) {
  const { bonus } = d;
  const top5 = bonus.top_fraudsters;
  const top1 = top5[0];
  const TYPE_S: Record<string,string> = { CARD_PAYMENT:"Card", TOPUP:"Top-up", ATM:"ATM", BANK_TRANSFER:"Transfer", P2P:"P2P" };
  const breakdown = top1 ? Object.entries(top1.type_breakdown).map(([t,c]) => ({ name: TYPE_S[t]||t, count: c as number })) : [];

  return (
    <ContentPage>
      <SecHead overline="Section 5 — Bonus" title="Top Fraudster Prioritisation" desc={`Composite risk score across ${fmt(bonus.total_fraudsters)} unique actors. Ranking by amount alone misses persistent, multi-channel actors. Score = frequency (40%) + impact (30%) + diversity + geography.`} />

      {/* Scoring weights */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 16px", marginBottom: 14 }}>
        {[
          { w:"40%", l:"Transaction Frequency", d:"Persistent actors defeat one-off detection" },
          { w:"30%", l:"Financial Impact",      d:"Total fraud amount (GBP)" },
          { w:"20%", l:"Method Diversity",      d:"Multi-channel evades rule-based systems" },
          { w:"10%", l:"Geographic Spread",     d:"Cross-country = organised crime" },
        ].map(s => (
          <div key={s.l} style={{ borderTop: `1.5px solid ${RULE}`, paddingTop: 8 }}>
            <p style={{ fontSize: 20, fontWeight: 900, color: INK, marginBottom: 4 }}>{s.w}</p>
            <p style={{ fontSize: 8.5, fontWeight: 700, color: MUTED, marginBottom: 2 }}>{s.l}</p>
            <p style={{ fontSize: 7.5, color: SUBTLE, lineHeight: 1.4 }}>{s.d}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 18 }}>
        {/* Top 5 list */}
        <div>
          <p style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: SUBTLE, marginBottom: 8 }}>
            Table 2 — Top 5 Priority Actors
          </p>
          {top5.map((f, i) => (
            <div key={f.full_id} style={{ paddingTop: 10, paddingBottom: 10, borderBottom: `1px solid ${RULE}`, display: "flex", gap: 14, alignItems: "flex-start" }}>
              {/* Rank */}
              <span style={{ fontSize: 13, fontWeight: 900, color: i === 0 ? INK : RULE, minWidth: 22, marginTop: 2 }}>#{i+1}</span>
              {/* Detail */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <code style={{ fontSize: 8, fontFamily: "monospace", color: MUTED }}>{f.id}</code>
                  <span style={{ fontSize: 7.5, fontWeight: 700, color: f.kyc==="PASSED" ? AMBER : RED }}>KYC {f.kyc}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                  {[
                    { l:"Txns",      v:fmt(f.txns) },
                    { l:"Amount",    v:fmtM(f.amount) },
                    { l:"Methods",   v:String(f.types_used) },
                    { l:"Countries", v:String(f.countries_hit) },
                  ].map(s => (
                    <div key={s.l}>
                      <p style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: SUBTLE, marginBottom: 2 }}>{s.l}</p>
                      <p style={{ fontSize: 12, fontWeight: 800, color: i===0?INK:MUTED }}>{s.v}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Score */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: SUBTLE, marginBottom: 2 }}>Score</p>
                <p style={{ fontSize: 14, fontWeight: 900, color: i===0?INK:SUBTLE }}>{f.score.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>

        {/* #1 breakdown chart */}
        {top1 && (
          <div>
            <ChartLabel>Figure 8 — #1 Actor: Method Breakdown</ChartLabel>
            {/* Dark strip for actor ID */}
            <div style={{ paddingBottom: 8, borderBottom: `1px solid ${RULE}`, marginBottom: 8 }}>
              <code style={{ fontSize: 7.5, color: SUBTLE, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{top1.id}</code>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={breakdown} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: SUBTLE, fontSize: 8, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: SUBTLE, fontSize: 8, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
                <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                  <div style={{ background:WHITE, border:`1px solid ${RULE}`, borderRadius:5, padding:"5px 8px", fontSize:10 }}>
                    <p style={{ color:MUTED }}>{label}</p>
                    <p style={{ color:INK, fontWeight:700 }}>{payload[0].value} txns</p>
                  </div>
                ) : null} cursor={{ fill:"#f8f8f8" }} />
                <Bar dataKey="count" radius={[2,2,0,0]}>
                  {breakdown.map((_,i) => <Cell key={i} fill={`rgba(15,15,15,${0.9-i*0.13})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px", marginTop: 10 }}>
              <div style={{ borderTop: `1.5px solid ${RED}`, paddingTop: 8 }}>
                <p style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: SUBTLE, marginBottom: 4 }}>Total Stolen</p>
                <p style={{ fontSize: 20, fontWeight: 900, color: RED }}>{fmtM(top1.amount)}</p>
              </div>
              <div style={{ borderTop: `1.5px solid ${RULE}`, paddingTop: 8 }}>
                <p style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: SUBTLE, marginBottom: 4 }}>Countries Hit</p>
                <p style={{ fontSize: 20, fontWeight: 900, color: INK }}>{top1.countries_hit}</p>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <Insight>
                <strong style={{ color: INK }}>dc283b17</strong> — 1,029 txns, 5 channels, 12 countries, KYC Pending. No legitimate user matches this profile.
              </Insight>
            </div>
          </div>
        )}
      </div>
      <Footer n={7} total={TOTAL} />
    </ContentPage>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 7 — RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════════
function Recommendations({ d }: { d: Analytics }) {
  const { brief1, overview, brief2b, bonus } = d;
  const gap = (brief1.marketing_rate - brief1.revolut_rate).toFixed(1);

  const recs = [
    {
      tag:"REC 1 · Brief 1",
      title:"Retire the 79.72% conversion metric",
      body:`Replace with ${brief1.revolut_rate}% — KYC-passed users with ≥1 legitimate card payment. This is the only signal of a revenue-positive primary account. The current metric overstates conversion by ${gap}pp by counting ${fmt(brief1.topup_users - brief1.revolut_converted_users)} users generating zero interchange revenue.`,
      ev:`${fmt(brief1.topup_users - brief1.revolut_converted_users)} users excluded under the correct definition.`,
    },
    {
      tag:"REC 2 · Brief 2A",
      title:"Dual-axis geographic risk model",
      body:`Track GB (volume: 13,088 cases, £382M) and DE (rate: 5.64%) on separate KPI dashboards with independent alert thresholds. A single volume-based view hides DE's rate — 1.7× higher than GB — which likely represents a different fraud vector.`,
      ev:`DE fraud rate 5.64% vs GB 3.4% despite a fraction of the transaction volume.`,
    },
    {
      tag:"REC 3 · Brief 2B",
      title:"Layer behavioural rules on top of KYC",
      body:`Flag users where ATM share >25% (+9.8pp above baseline), bank transfer share >15% (+6.8pp), or card payment share <50% (vs 63.8% for legitimate users). Two or more signals within 30 days of registration should trigger enhanced due diligence.`,
      ev:`${fmt(brief2b.fraud_count)} fraud txns from KYC-passed users bypassed identity controls entirely.`,
    },
    {
      tag:"REC 4 · Bonus",
      title:"Immediate action + nightly composite scoring",
      body:`Suspend dc283b17 (score 18,768 — 4.6× second-ranked) immediately. Run composite scoring nightly across all ${fmt(bonus.total_fraudsters)} actors to surface emerging high-risk profiles before losses compound further.`,
      ev:`dc283b17: 1,029 txns across 12 countries; no legitimate profile matches this pattern.`,
    },
  ];

  return (
    <ContentPage>
      <SecHead overline="Section 6" title="Recommendations" desc="Each recommendation is directly traceable to a quantified finding. No action is proposed without a supporting data point." />

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {recs.map((r, i) => (
          <div key={r.tag} style={{ paddingTop: 14, paddingBottom: 14, borderBottom: `1px solid ${RULE}` }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ minWidth: 3, alignSelf: "stretch", background: i === 0 ? INK : RULE, borderRadius: 99, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: SUBTLE, marginBottom: 4 }}>{r.tag}</p>
                <p style={{ fontSize: 12, fontWeight: 800, color: INK, letterSpacing: "-0.01em", marginBottom: 5 }}>{r.title}</p>
                <Body style={{ marginBottom: 8 }}>{r.body}</Body>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                  <span style={{ fontSize: 7.5, fontWeight: 800, color: SUBTLE, flexShrink: 0 }}>EVIDENCE</span>
                  <p style={{ fontSize: 8.5, color: SUBTLE, fontStyle: "italic" }}>{r.ev}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Strategic synthesis */}
      <div style={{ marginTop: 14, paddingTop: 10, borderTop: `2px solid ${INK}` }}>
        <p style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: SUBTLE, marginBottom: 5 }}>Strategic Synthesis</p>
        <Body>
          Taken together, these findings reveal a single systemic gap: Revolut&apos;s defences are calibrated to stop fraud <em>at the gate</em> (KYC) rather than <em>in motion</em>.
          The conversion inflation, the geographic blind spot, the KYC bypass pattern, and the persistence of top actors all point to the same root cause — <strong style={{ color: INK }}>post-onboarding behavioural monitoring is absent.</strong>{" "}
          Fixing any one of these in isolation treats a symptom. Addressing the root cause — real-time transaction-level anomaly detection layered on top of identity verification — resolves all four simultaneously.
        </Body>
      </div>

      {/* Methodology note */}
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${RULE}` }}>
        <p style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: SUBTLE, marginBottom: 5 }}>Dataset & Methodology Notes</p>
        <Body>
          {fmt(overview.total_txns)} transactions · {fmt(overview.unique_users)} unique users · {fmtM(overview.total_amount)} total volume.
          No date column present — the 30-day registration window could not be applied, but all directional findings remain consistent.
          Geographic analysis excludes countries with &lt;50 transactions; rows where <code>MERCHANT_COUNTRY</code> is null are retained and labelled &ldquo;Unknown / Null&rdquo; — they participate in volume ranking as a distinct category rather than being silently dropped.
          Composite fraud actor score independently derived with no reliance on pre-existing risk flags.
        </Body>
      </div>
      <Footer n={8} total={TOTAL} />
    </ContentPage>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function ReportPage() {
  const [data, setData]     = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/analytics.json")
      .then(r => r.json())
      .then((d: Analytics) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
      <p style={{ fontSize:13, color:"#a3a3a3" }}>Generating report…</p>
    </div>
  );
  if (!data) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
      <p style={{ fontSize:13, color:"#a3a3a3" }}>No data — please upload a dataset first.</p>
    </div>
  );

  return (
    <div style={{ background:"#c8c8c8", minHeight:"100vh", paddingBottom:60 }}>
      {/* Toolbar */}
      <div className="report-no-print" style={{
        position:"fixed", top:0, left:0, right:0, zIndex:100,
        background:"#0f0f0f", display:"flex", alignItems:"center",
        justifyContent:"space-between", padding:"0 28px", height:50,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <a href="/" style={{ fontSize:12, color:"rgba(255,255,255,0.45)", textDecoration:"none" }}>← Dashboard</a>
          <span style={{ color:"rgba(255,255,255,0.12)" }}>|</span>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.45)" }}>Financial Crime Intelligence Report</span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <a href="/slides" style={{ fontSize:12, fontWeight:600, padding:"6px 14px", borderRadius:7, border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.55)", textDecoration:"none" }}>
            Slides
          </a>
          <button onClick={() => window.print()} style={{
            fontSize:12, fontWeight:700, padding:"6px 18px", borderRadius:7,
            background:"#fff", color:"#0f0f0f", border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", gap:7,
          }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Pages */}
      <div className="report-pages-container" style={{ paddingTop:66, display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>
        <TitlePage />
        <CoverData       d={data} />
        <ExecSummary     d={data} />
        <ConversionRate  d={data} />
        <GeographicRisk  d={data} />
        <KYCPatterns     d={data} />
        <TopFraudsters   d={data} />
        <Recommendations d={data} />
      </div>
    </div>
  );
}

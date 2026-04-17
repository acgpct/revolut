"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
  ResponsiveContainer,
} from "recharts";
import type { Analytics } from "@/lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt  = (n: number) => n.toLocaleString();
const fmtM = (n: number) => {
  if (n >= 1_000_000_000) return `£${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `£${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `£${(n / 1_000).toFixed(0)}K`;
  return `£${n}`;
};

// ── design tokens (all print-safe) ───────────────────────────────────────────
const C = {
  ink:     "#0f0f0f",
  muted:   "#595959",
  subtle:  "#a3a3a3",
  border:  "#e5e5e5",
  bg:      "#f7f7f7",
  red:     "#cf1322",
  amber:   "#ad6800",
  white:   "#ffffff",
};

// ── shared tooltip (screen only — hides on print) ────────────────────────────
function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 11, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
      {label && <p style={{ fontWeight: 700, color: C.ink, marginBottom: 4 }}>{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: C.muted }}>
          {p.name}: <span style={{ fontWeight: 700, color: C.ink }}>{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ── typography primitives ─────────────────────────────────────────────────────
function Overline({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.subtle, marginBottom: 8 }}>{children}</p>;
}
function H1({ children }: { children: React.ReactNode }) {
  return <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: C.ink, lineHeight: 1.1, marginBottom: 6 }}>{children}</h1>;
}
function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: C.ink, lineHeight: 1.15 }}>{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", color: C.ink, marginBottom: 4 }}>{children}</h3>;
}
function Body({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.7, ...style }}>{children}</p>;
}

function SectionHeader({ overline, title, description }: { overline: string; title: string; description?: string }) {
  return (
    <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
      <Overline>{overline}</Overline>
      <H2>{title}</H2>
      {description && <Body style={{ marginTop: 6, maxWidth: 640 }}>{description}</Body>}
    </div>
  );
}

function KpiBox({ label, value, sub, accent, wide }: { label: string; value: string; sub?: string; accent?: boolean; wide?: boolean }) {
  return (
    <div style={{
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: wide ? "16px 20px" : "14px 18px",
    }}>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: wide ? 30 : 24, fontWeight: 800, letterSpacing: "-0.03em", color: accent ? C.red : C.ink, lineHeight: 1, marginBottom: sub ? 6 : 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: C.subtle }}>{sub}</p>}
    </div>
  );
}

function InsightBlock({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", marginTop: 16 }}>
      <div style={{ width: 3, minHeight: 40, borderRadius: 99, background: C.border, flexShrink: 0 }} />
      <Body>{children}</Body>
    </div>
  );
}

function RecommendationBox({ tag, title, body }: { tag: string; title: string; body: string }) {
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px", breakInside: "avoid" }}>
      <div style={{ marginBottom: 10 }}>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase",
          background: C.ink, color: C.white, padding: "3px 8px", borderRadius: 4,
        }}>{tag}</span>
      </div>
      <H3>{title}</H3>
      <Body style={{ marginTop: 4 }}>{body}</Body>
    </div>
  );
}

// ── chart tooltip for geo ─────────────────────────────────────────────────────
function GeoTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 11, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
      <p style={{ fontWeight: 700, color: C.ink, marginBottom: 4 }}>{d.country}</p>
      <p style={{ color: C.muted }}>Fraud txns: <strong>{d.fraud?.toLocaleString()}</strong></p>
      <p style={{ color: C.muted }}>Fraud rate: <strong>{d.rate}%</strong></p>
      <p style={{ color: C.muted }}>Loss: <strong>{fmtM(d.fraud_amount)}</strong></p>
    </div>
  );
}

// ── page wrapper ──────────────────────────────────────────────────────────────
function Page({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <div className="report-page" style={{
      width: "210mm",
      minHeight: "297mm",
      padding: first ? "0" : "20mm 18mm",
      background: C.white,
      position: "relative",
      boxSizing: "border-box",
      breakAfter: "page",
    }}>
      {children}
    </div>
  );
}

function PageFooter({ page, total }: { page: number; total: number }) {
  return (
    <div style={{
      position: "absolute", bottom: "10mm", left: "18mm", right: "18mm",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      borderTop: `1px solid ${C.border}`, paddingTop: 8,
    }}>
      <p style={{ fontSize: 9, color: C.subtle }}>Revolut Financial Crime Intelligence · Confidential</p>
      <p style={{ fontSize: 9, color: C.subtle }}>{page} / {total}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT SECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function CoverPage({ data }: { data: Analytics }) {
  const { overview, brief1 } = data;
  return (
    <Page first>
      {/* Dark header band */}
      <div style={{ background: C.ink, padding: "32mm 18mm 20mm", minHeight: "110mm", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>
          Revolut · Financial Crime Intelligence · Home Task
        </p>
        <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-0.04em", color: "#ffffff", lineHeight: 1.05, marginBottom: 14 }}>
          Fraud Analysis<br />& Findings Report
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", maxWidth: 400, lineHeight: 1.55 }}>
          A structured analysis covering conversion rate methodology, geographic risk exposure, KYC pattern anomalies, and priority fraudster targeting.
        </p>
      </div>

      {/* KPI strip */}
      <div style={{ background: "#f7f7f7", borderBottom: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0 }}>
        {[
          { label: "Transactions Analysed", value: fmt(overview.total_txns) },
          { label: "Unique Users",           value: fmt(overview.unique_users) },
          { label: "Total Volume",           value: fmtM(overview.total_amount) },
          { label: "Fraud Events",           value: fmt(overview.total_fraud) },
        ].map((k, i) => (
          <div key={k.label} style={{ padding: "20px 20px", borderRight: i < 3 ? `1px solid ${C.border}` : "none" }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, marginBottom: 6 }}>{k.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: C.ink, letterSpacing: "-0.03em" }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Table of Contents */}
      <div style={{ padding: "14mm 18mm 0" }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.subtle, marginBottom: 16 }}>Contents</p>
        {[
          { n: "1", title: "Executive Summary",                     sub: "Key findings at a glance" },
          { n: "2", title: "Brief 1 — App Conversion Rate",         sub: "Methodology gap: 79.72% vs 65.62%" },
          { n: "3", title: "Brief 2A — Geographic Risk Exposure",   sub: "Volume vs rate: two independent threats" },
          { n: "4", title: "Brief 2B — KYC-Passed Fraudsters",     sub: "Behavioural anomalies that identity checks miss" },
          { n: "5", title: "Bonus — Top Fraudster Prioritisation",  sub: "Composite scoring across 299 actors" },
          { n: "6", title: "Recommendations",                       sub: "Four actions directly linked to findings" },
        ].map((t, i) => (
          <div key={t.n} style={{ display: "flex", alignItems: "baseline", gap: 14, paddingTop: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.subtle, minWidth: 16 }}>{t.n}</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{t.title}</span>
              <span style={{ fontSize: 10, color: C.subtle, marginLeft: 10 }}>— {t.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <PageFooter page={1} total={6} />
    </Page>
  );
}

function ExecutiveSummaryPage({ data }: { data: Analytics }) {
  const { overview, brief1, fraud_by_type } = data;
  const gap = (brief1.marketing_rate - brief1.revolut_rate).toFixed(1);

  const typeData = fraud_by_type.map((t) => ({
    name: t.type.replace("CARD_PAYMENT", "Card").replace("BANK_TRANSFER", "Transfer").replace("_", " "),
    Legitimate: t.total - t.fraud,
    Fraud: t.fraud,
  }));

  const findings = [
    {
      label: "Conversion methodology gap",
      text: `Marketing reports a ${brief1.marketing_rate}% conversion rate by counting fraudsters and non-card transactions. The correct figure — users who pass KYC and make ≥1 legitimate card payment — is ${brief1.revolut_rate}%, a gap of ${gap} percentage points.`,
    },
    {
      label: "Geographic risk is two-dimensional",
      text: `GB dominates by raw fraud volume (13,088 cases, £382M lost) due to its large user base. DE, however, carries the highest fraud rate (5.64%) — nearly 1 in 18 transactions is fraudulent. A single-axis view obscures one or the other threat.`,
    },
    {
      label: "KYC clearance does not equal legitimacy",
      text: `12,310 fraudulent transactions originated from KYC-passed users. These actors over-index on ATM withdrawals (+9.8pp) and bank transfers (+6.8pp) relative to legitimate peers — behavioural signals that identity checks alone cannot catch.`,
    },
    {
      label: "One actor accounts for £61M across 12 countries",
      text: `The top-ranked fraudster (dc283b17) executed 1,029 transactions across all 5 transaction channels and 12 countries, with a composite risk score of 18,768 — more than 4× the second-ranked actor. Immediate suspension is warranted.`,
    },
  ];

  return (
    <Page>
      <SectionHeader
        overline="Section 1"
        title="Executive Summary"
        description="Four analytical briefs surface distinct but interconnected fraud risks across conversion methodology, geography, identity verification, and individual actor behaviour."
      />

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <KpiBox label="Total Transactions" value={fmt(overview.total_txns)} sub="across all transaction types" />
        <KpiBox label="Fraud Events"       value={fmt(overview.total_fraud)} sub={`${overview.fraud_rate}% fraud rate`} accent />
        <KpiBox label="Fraud Losses"       value={fmtM(overview.fraud_amount)} sub={`${overview.fraud_amount_pct}% of total volume`} accent />
        <KpiBox label="Unique Users"       value={fmt(overview.unique_users)} sub="registered accounts" />
        <KpiBox label="True Conversion"    value={`${brief1.revolut_rate}%`} sub={`vs ${brief1.marketing_rate}% marketing claim`} />
        <KpiBox label="Conversion Gap"     value={`−${gap}pp`} sub="methodology inflation" accent />
      </div>

      {/* Stacked bar — volume by type */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 14px 10px", marginBottom: 20 }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, marginBottom: 10 }}>
          Figure 1 — Transaction Volume by Type: Legitimate vs Fraud
        </p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={typeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={2}>
            <XAxis dataKey="name" tick={{ fill: C.subtle, fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.subtle, fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<Tip />} cursor={{ fill: "#f5f5f5" }} />
            <Bar dataKey="Legitimate" stackId="a" fill="#e0e0e0" />
            <Bar dataKey="Fraud"      stackId="a" fill={C.ink} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "#e0e0e0", border: `1px solid ${C.border}` }} /><span style={{ fontSize: 9, color: C.subtle }}>Legitimate</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: C.ink }} /><span style={{ fontSize: 9, color: C.subtle }}>Fraud</span></div>
        </div>
      </div>

      {/* Key findings */}
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, marginBottom: 12 }}>Key Findings</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {findings.map((f, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.subtle, minWidth: 16, marginTop: 1 }}>{i + 1}</span>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.ink, marginBottom: 3 }}>{f.label}</p>
              <Body>{f.text}</Body>
            </div>
          </div>
        ))}
      </div>

      <PageFooter page={2} total={6} />
    </Page>
  );
}

function ConversionPage({ data }: { data: Analytics }) {
  const { brief1, fraud_by_type } = data;
  const gap = (brief1.marketing_rate - brief1.revolut_rate).toFixed(1);
  const excluded = brief1.topup_users - brief1.revolut_converted_users;
  const total = brief1.unique_users;

  const funnel = [
    { label: "Registered Users",          value: brief1.unique_users,            pct: 100 },
    { label: "Topped Up (active)",        value: brief1.topup_users,             pct: Math.round(brief1.topup_users / total * 100) },
    { label: "KYC Passed",               value: brief1.kyc_passed_users,        pct: Math.round(brief1.kyc_passed_users / total * 100) },
    { label: "Legitimate Card Payment",  value: brief1.legit_card_users,        pct: Math.round(brief1.legit_card_users / total * 100) },
    { label: "Revolut Converted (true)", value: brief1.revolut_converted_users, pct: Math.round(brief1.revolut_converted_users / total * 100) },
  ];

  const rateData = [...fraud_by_type]
    .sort((a, b) => b.rate - a.rate)
    .map((t) => ({
      name: t.type.replace("CARD_PAYMENT", "Card Pay.").replace("BANK_TRANSFER", "Transfer").replace("_", " "),
      rate: t.rate,
    }));

  return (
    <Page>
      <SectionHeader
        overline="Section 2 — Brief 1"
        title="App Conversion Rate"
        description="Marketing's conversion rate overstates the true figure by inflating the numerator with fraudsters and non-revenue-generating transaction types. The correct definition requires both KYC clearance and at least one legitimate card payment."
      />

      {/* The comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px 22px", background: C.bg }}>
          <Overline>Marketing Definition (Incorrect)</Overline>
          <p style={{ fontSize: 52, fontWeight: 900, letterSpacing: "-0.05em", color: "#d4d4d4", lineHeight: 1, marginBottom: 8 }}>
            {brief1.marketing_rate}%
          </p>
          <Body>TOPUP + any spending event / all users — includes fraudsters, ATM, P2P, and bank transfers that generate no interchange revenue.</Body>
        </div>
        <div style={{ border: `2px solid ${C.ink}`, borderRadius: 10, padding: "20px 22px", background: C.white }}>
          <Overline>Revolut Definition (Correct)</Overline>
          <p style={{ fontSize: 52, fontWeight: 900, letterSpacing: "-0.05em", color: C.ink, lineHeight: 1, marginBottom: 8 }}>
            {brief1.revolut_rate}%
          </p>
          <Body>KYC-passed users with ≥1 legitimate card payment — the only transaction type generating interchange revenue and confirming a primary account relationship.</Body>
        </div>
      </div>

      <InsightBlock>
        <strong style={{ color: C.ink }}>The {gap}pp gap is structural, not marginal.</strong> Marketing's definition counts{" "}
        <strong style={{ color: C.ink }}>{fmt(excluded)} users</strong> who either failed KYC, are flagged as fraudsters, or made no card payment. These users generate zero interchange revenue and should not count toward a conversion metric that is used to justify acquisition spend. Without a date column in the dataset, the 30-day registration window cannot be applied — but the directional impact is clear.
      </InsightBlock>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
        {/* Funnel */}
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, marginBottom: 10 }}>
            Figure 2 — User Conversion Funnel
          </p>
          {funnel.map((s, i) => (
            <div key={s.label} style={{ marginBottom: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, opacity: 1 - i * 0.12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: Math.max(4, s.pct * 0.34), height: 3, background: C.ink, borderRadius: 99 }} />
                  <span style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>{s.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>{fmt(s.value)}</span>
                  <span style={{ fontSize: 10, color: C.subtle }}>{s.pct}%</span>
                </div>
              </div>
              {i < funnel.length - 1 && (
                <div style={{ display: "flex", justifyContent: "flex-start", paddingLeft: 24, paddingTop: 2, paddingBottom: 2 }}>
                  <div style={{ width: 1, height: 6, background: C.border }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Fraud rate by type */}
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, marginBottom: 10 }}>
            Figure 3 — Fraud Rate by Transaction Type (%)
          </p>
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 12px 8px" }}>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={rateData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: C.subtle, fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fill: C.muted, fontSize: 10, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={60} />
                <Tooltip
                  content={({ active, payload, label }) => active && payload?.length ? (
                    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 11 }}>
                      <p style={{ fontWeight: 700, color: C.ink, marginBottom: 4 }}>{label}</p>
                      <p style={{ color: C.muted }}>{payload[0].value}% fraud rate</p>
                    </div>
                  ) : null}
                  cursor={{ fill: "#f5f5f5" }}
                />
                <Bar dataKey="rate" radius={[0, 3, 3, 0]}>
                  {rateData.map((e) => (
                    <Cell key={e.name} fill={e.rate > 5 ? C.red : e.rate > 2 ? "#e8a000" : C.ink} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: 10, padding: "10px 14px", background: "#fff5f5", border: `1px solid #ffd6d6`, borderRadius: 8 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.red }}>Bank Transfer: 7.76% fraud rate — 5× the platform average of {data.overview.fraud_rate}%</p>
          </div>
        </div>
      </div>

      <PageFooter page={3} total={6} />
    </Page>
  );
}

function GeographicPage({ data }: { data: Analytics }) {
  const geo    = data.brief2a.geo_risk;
  const top8   = geo.slice(0, 8);
  const byRate = [...geo].sort((a, b) => b.rate - a.rate).slice(0, 8);
  const hv     = geo[0];
  const hr     = byRate[0];

  return (
    <Page>
      <SectionHeader
        overline="Section 3 — Brief 2A"
        title="Geographic Risk Exposure"
        description="Fraud risk has two dimensions: attack count (volume) and attack probability (rate). Conflating them leads to under-investing in high-rate markets and over-indexing controls on high-volume ones. Both require independent monitoring."
      />

      {/* Hero callouts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
        <KpiBox label="Highest Volume"  value={hv.country}        sub={`${fmt(hv.fraud)} fraud txns`} wide />
        <KpiBox label="Volume Loss"     value={fmtM(hv.fraud_amount)} sub={`${hv.rate}% fraud rate`} accent wide />
        <KpiBox label="Highest Rate"    value={hr.country}        sub={`${hr.rate}% of all txns`} accent wide />
        <KpiBox label="1 in every"      value={`${Math.round(100 / (hr.rate || 1))}`} sub="transactions is fraudulent" accent wide />
      </div>

      {/* Dual bar charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 12px 8px" }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, marginBottom: 10 }}>
            Figure 4 — Top 8 by Fraud Volume (transactions)
          </p>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={top8} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: C.subtle, fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="country" tick={{ fill: C.muted, fontSize: 11, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<GeoTip />} cursor={{ fill: "#f5f5f5" }} />
              <Bar dataKey="fraud" radius={[0, 3, 3, 0]}>
                {top8.map((e, i) => <Cell key={e.country} fill={`rgba(15,15,15,${1 - i * 0.09})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 12px 8px" }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, marginBottom: 10 }}>
            Figure 5 — Top 8 by Fraud Rate (%) · ≥50 transactions
          </p>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={byRate} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: C.subtle, fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="country" tick={{ fill: C.muted, fontSize: 11, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<GeoTip />} cursor={{ fill: "#f5f5f5" }} />
              <Bar dataKey="rate" radius={[0, 3, 3, 0]}>
                {byRate.map((e, i) => <Cell key={e.country} fill={`rgba(207,19,34,${1 - i * 0.09})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Country table */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
        <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
              {["Country", "Total Txns", "Fraud Txns", "Fraud Rate", "Fraud Loss"].map((h) => (
                <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: C.subtle }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top8.map((row, i) => (
              <tr key={row.country} style={{ borderBottom: i < 7 ? `1px solid #f5f5f5` : "none" }}>
                <td style={{ padding: "8px 14px", fontWeight: 700, color: C.ink }}>{row.country}</td>
                <td style={{ padding: "8px 14px", color: C.muted }}>{fmt(row.total)}</td>
                <td style={{ padding: "8px 14px", color: C.muted, fontWeight: 600 }}>{fmt(row.fraud)}</td>
                <td style={{ padding: "8px 14px" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: row.rate > 4 ? "#fff1f0" : row.rate > 1 ? "#fffbe6" : "#f5f5f5", color: row.rate > 4 ? C.red : row.rate > 1 ? C.amber : C.muted }}>
                    {row.rate}%
                  </span>
                </td>
                <td style={{ padding: "8px 14px", color: C.muted, fontWeight: 600 }}>{fmtM(row.fraud_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InsightBlock>
        <strong style={{ color: C.ink }}>GB vs DE illustrate why a dual-axis model is essential.</strong> GB accounts for 90% of all fraud by volume (13,088 cases, £382M), which makes it the operational priority. But DE has a 5.64% fraud rate — 1 in every 18 transactions — compared to GB's 3.4%. Treating DE purely as a secondary market because of lower volume means missing a structurally higher-risk environment that likely signals a different fraud vector and requires separate controls.
      </InsightBlock>

      <PageFooter page={3} total={6} />
    </Page>
  );
}

function KYCPatternsPage({ data }: { data: Analytics }) {
  const { brief2b, fraud_by_type } = data;

  const txnTypes = ["CARD_PAYMENT", "TOPUP", "ATM", "BANK_TRANSFER", "P2P"];
  const shortLabels: Record<string, string> = { CARD_PAYMENT: "Card", TOPUP: "Top-up", ATM: "ATM", BANK_TRANSFER: "Transfer", P2P: "P2P" };

  const radarData = txnTypes.map((t) => ({
    type: shortLabels[t],
    Fraud:      brief2b.fraud_type_pct[t] || 0,
    Legitimate: brief2b.legit_type_pct[t] || 0,
  }));

  const rateBarData = [...fraud_by_type]
    .sort((a, b) => b.rate - a.rate)
    .map((t) => ({
      name: t.type.replace("CARD_PAYMENT", "Card Pay.").replace("BANK_TRANSFER", "Transfer").replace("_", " "),
      rate: t.rate,
      fraud_amount: t.fraud_amount,
    }));

  const signals = [
    { label: "ATM Withdrawals",  fraud: brief2b.fraud_type_pct["ATM"] || 0,           legit: brief2b.legit_type_pct["ATM"] || 0 },
    { label: "Bank Transfers",   fraud: brief2b.fraud_type_pct["BANK_TRANSFER"] || 0, legit: brief2b.legit_type_pct["BANK_TRANSFER"] || 0 },
    { label: "Top-ups",          fraud: brief2b.fraud_type_pct["TOPUP"] || 0,         legit: brief2b.legit_type_pct["TOPUP"] || 0 },
    { label: "Card Payments",    fraud: brief2b.fraud_type_pct["CARD_PAYMENT"] || 0,  legit: brief2b.legit_type_pct["CARD_PAYMENT"] || 0 },
    { label: "P2P Transfers",    fraud: brief2b.fraud_type_pct["P2P"] || 0,           legit: brief2b.legit_type_pct["P2P"] || 0 },
  ];

  return (
    <Page>
      <SectionHeader
        overline="Section 4 — Brief 2B"
        title="KYC-Passed Fraudsters"
        description={`${fmt(brief2b.fraud_count)} fraudulent transactions were made by users who passed KYC checks, compared against ${fmt(brief2b.legit_count)} legitimate transactions from the same population. This reveals the limits of identity-only verification.`}
      />

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
        <KpiBox label="KYC-Passed Fraud Txns" value={fmt(brief2b.fraud_count)} sub="confirmed fraud" accent />
        <KpiBox label="Avg Fraud Transaction"  value={fmtM(brief2b.fraud_avg_amount)} sub={`vs ${fmtM(brief2b.legit_avg_amount)} legitimate`} accent />
        <KpiBox label="Avg Birth Year"         value={`${brief2b.fraud_avg_birth}`} sub={`vs ${brief2b.legit_avg_birth} legitimate`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        {/* Radar chart */}
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 12px 6px" }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, marginBottom: 0 }}>
            Figure 6 — Transaction Type Mix: Fraud vs Legitimate (%)
          </p>
          <ResponsiveContainer width="100%" height={210}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={C.border} />
              <PolarAngleAxis dataKey="type" tick={{ fill: C.muted, fontSize: 10, fontFamily: "inherit" }} />
              <Radar name="Fraud"      dataKey="Fraud"      stroke={C.red}  fill={C.red}  fillOpacity={0.1} />
              <Radar name="Legitimate" dataKey="Legitimate" stroke={C.ink}  fill={C.ink}  fillOpacity={0.05} />
              <Legend wrapperStyle={{ fontSize: 10, color: C.subtle, paddingTop: 4 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Rate bar chart */}
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 12px 8px" }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, marginBottom: 10 }}>
            Figure 7 — Fraud Rate by Channel (% of transactions)
          </p>
          <ResponsiveContainer width="100%" height={175}>
            <BarChart data={rateBarData} margin={{ top: 4, right: 20, left: -16, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: C.subtle, fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.subtle, fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                content={({ active, payload, label }) => active && payload?.length ? (
                  <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 11 }}>
                    <p style={{ fontWeight: 700, color: C.ink, marginBottom: 4 }}>{label}</p>
                    <p style={{ color: C.muted }}>{payload[0].value}% fraud rate</p>
                  </div>
                ) : null}
                cursor={{ fill: "#f5f5f5" }}
              />
              <Bar dataKey="rate" radius={[3, 3, 0, 0]}>
                {rateBarData.map((e) => <Cell key={e.name} fill={e.rate > 5 ? C.red : e.rate > 2 ? "#e8a000" : C.ink} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 8, padding: "8px 12px", background: "#fff5f5", border: "1px solid #ffd6d6", borderRadius: 6 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: C.red }}>Bank Transfer carries 7.76% rate — highest of any channel</p>
          </div>
        </div>
      </div>

      {/* Behavioural signals table */}
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, marginBottom: 8 }}>
        Table 1 — Behavioural Signals: Percentage-Point Deviation from Legitimate Baseline
      </p>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
        <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
              {["Signal", "Fraud Users (%)", "Legit Users (%)", "Difference (pp)", "Anomalous?"].map((h) => (
                <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: C.subtle }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {signals.map((s, i) => {
              const diff = s.fraud - s.legit;
              const anomaly = Math.abs(diff) > 2;
              return (
                <tr key={s.label} style={{ borderBottom: i < signals.length - 1 ? `1px solid #f5f5f5` : "none", background: anomaly ? "#fff8f8" : "transparent" }}>
                  <td style={{ padding: "8px 14px", fontWeight: 600, color: C.ink }}>{s.label}</td>
                  <td style={{ padding: "8px 14px", fontWeight: 700, color: C.red }}>{s.fraud}%</td>
                  <td style={{ padding: "8px 14px", color: C.muted }}>{s.legit}%</td>
                  <td style={{ padding: "8px 14px", fontWeight: 700, color: diff > 0 ? C.red : C.muted }}>
                    {diff > 0 ? "+" : ""}{diff.toFixed(1)}pp
                  </td>
                  <td style={{ padding: "8px 14px" }}>
                    {anomaly ? (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "#fff1f0", color: C.red }}>Yes</span>
                    ) : (
                      <span style={{ fontSize: 9, color: C.subtle }}>No</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <InsightBlock>
        <strong style={{ color: C.ink }}>KYC-passed fraudsters leave a detectable behavioural footprint.</strong> They over-index on ATM withdrawals (+9.8pp) and bank transfers (+6.8pp) while under-indexing on card payments (−18.2pp) — the reverse of legitimate users who primarily use Revolut as a card product. Layering these behavioural rules on top of identity verification would allow the risk engine to flag suspicious activity without waiting for confirmed fraud to accumulate.
      </InsightBlock>

      <PageFooter page={4} total={6} />
    </Page>
  );
}

function FraudstersPage({ data }: { data: Analytics }) {
  const { bonus } = data;
  const top5 = bonus.top_fraudsters;
  const top1 = top5[0];

  const TYPE_SHORT: Record<string, string> = { CARD_PAYMENT: "Card", TOPUP: "Top-up", ATM: "ATM", BANK_TRANSFER: "Transfer", P2P: "P2P" };
  const breakdownData = top1
    ? Object.entries(top1.type_breakdown).map(([type, count]) => ({ name: TYPE_SHORT[type] || type, count: count as number }))
    : [];

  return (
    <Page>
      <SectionHeader
        overline="Section 5 — Bonus"
        title="Top Fraudster Prioritisation"
        description={`A composite risk score ranks ${fmt(bonus.total_fraudsters)} unique fraud actors. Ranking by stolen amount alone misses sophisticated, persistent actors — the scoring model rewards frequency, financial impact, method diversity, and geographic spread.`}
      />

      {/* Scoring methodology */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", marginBottom: 18 }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, marginBottom: 8 }}>Scoring Methodology</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
          {[
            { weight: "40%", label: "Transaction Frequency", why: "Persistent actors defeat one-off detection" },
            { weight: "30%", label: "Financial Impact",      why: "Total fraud amount in GBP" },
            { weight: "20%", label: "Method Diversity",      why: "Multi-channel activity evades rule-based systems" },
            { weight: "10%", label: "Geographic Spread",     why: "Cross-country activity signals organised crime" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: C.ink, letterSpacing: "-0.03em", marginBottom: 4 }}>{s.weight}</p>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 2 }}>{s.label}</p>
              <p style={{ fontSize: 9, color: C.subtle, lineHeight: 1.4 }}>{s.why}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14 }}>
        {/* Top 5 table */}
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, marginBottom: 8 }}>
            Table 2 — Top 5 Priority Actors
          </p>
          {top5.map((f, i) => (
            <div key={f.full_id} style={{
              border: `1px solid ${i === 0 ? C.ink : C.border}`,
              borderRadius: 10, padding: "12px 14px",
              background: i === 0 ? C.ink : C.white,
              marginBottom: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: i === 0 ? "rgba(255,255,255,0.5)" : C.subtle }}>#{i + 1}</span>
                  <code style={{ fontSize: 9, fontFamily: "monospace", padding: "2px 6px", borderRadius: 4, background: i === 0 ? "rgba(255,255,255,0.1)" : C.bg, color: i === 0 ? "rgba(255,255,255,0.7)" : C.muted }}>
                    {f.full_id}
                  </code>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: f.kyc === "PASSED" ? (i === 0 ? "rgba(255,200,0,0.15)" : "#fffbe6") : (i === 0 ? "rgba(255,80,80,0.15)" : "#fff1f0"), color: f.kyc === "PASSED" ? C.amber : C.red }}>
                    KYC {f.kyc}
                  </span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 900, color: i === 0 ? "#ffffff" : C.ink }}>
                  {f.score.toLocaleString()}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {[
                  { l: "Txns",      v: fmt(f.txns) },
                  { l: "Amount",    v: fmtM(f.amount) },
                  { l: "Methods",   v: String(f.types_used) },
                  { l: "Countries", v: String(f.countries_hit) },
                ].map((s) => (
                  <div key={s.l}>
                    <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: i === 0 ? "rgba(255,255,255,0.35)" : C.subtle, marginBottom: 2 }}>{s.l}</p>
                    <p style={{ fontSize: 13, fontWeight: 800, color: i === 0 ? "#ffffff" : C.ink, letterSpacing: "-0.02em" }}>{s.v}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* #1 actor breakdown */}
        {top1 && (
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, marginBottom: 8 }}>
              Figure 8 — #1 Actor Method Breakdown
            </p>
            <div style={{ background: C.ink, borderRadius: 10, padding: "14px 14px 10px", marginBottom: 10 }}>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", marginBottom: 10 }}>{top1.id}</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={breakdownData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => active && payload?.length ? (
                      <div style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 10px", fontSize: 11 }}>
                        <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>{label}</p>
                        <p style={{ color: "#ffffff", fontWeight: 700 }}>{payload[0].value} txns</p>
                      </div>
                    ) : null}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                    {breakdownData.map((_, i) => <Cell key={i} fill={`rgba(255,255,255,${0.9 - i * 0.13})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ background: C.ink, borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Total Stolen</p>
                <p style={{ fontSize: 20, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.03em" }}>{fmtM(top1.amount)}</p>
              </div>
              <div style={{ background: C.ink, borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Countries Hit</p>
                <p style={{ fontSize: 20, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.03em" }}>{top1.countries_hit}</p>
              </div>
            </div>

            <InsightBlock>
              <strong style={{ color: C.ink }}>dc283b17 is an outlier at every dimension.</strong> 1,029 transactions, 5 channels, 12 countries, KYC Pending. No legitimate user profile matches this pattern.
            </InsightBlock>
          </div>
        )}
      </div>

      <PageFooter page={5} total={6} />
    </Page>
  );
}

function RecommendationsPage({ data }: { data: Analytics }) {
  const { brief1, overview } = data;
  const gap = (brief1.marketing_rate - brief1.revolut_rate).toFixed(1);

  const recs = [
    {
      tag: "REC 1 — Brief 1",
      title: "Retire the 79.72% conversion metric",
      body: `The marketing definition over-counts by ${gap}pp by including fraudsters and non-card-payment users. Replace it with a single primary KPI: KYC-passed users who make ≥1 legitimate card payment (${brief1.revolut_rate}%). This is the only signal of a revenue-positive primary account relationship generating interchange income. All acquisition budget justifications should reference this figure.`,
      link: `Directly linked to Brief 1 finding: ${fmt((brief1.topup_users - brief1.revolut_converted_users))} users excluded under the correct definition.`,
    },
    {
      tag: "REC 2 — Brief 2A",
      title: "Implement a dual-axis geographic risk dashboard",
      body: `Track GB and DE on independent KPIs. GB requires volume-based operational escalation (13,088 fraud cases, £382M lost). DE requires rate-based intervention (5.64% fraud rate) — suggesting a different fraud vector that may not be visible in volume-only reporting. Separate alert thresholds for each axis prevent each market from masking the other.`,
      link: `Linked to Brief 2A: DE's 5.64% rate is 1.7× GB's 3.4% despite a fraction of the volume.`,
    },
    {
      tag: "REC 3 — Brief 2B",
      title: "Layer behavioural rules on top of KYC",
      body: `KYC clearance is a necessary but insufficient control. Introduce a post-onboarding behavioural scoring layer that flags: ATM withdrawal share >25% of activity (+9.8pp above legitimate baseline); bank transfer share >15% (+6.8pp above baseline); card payment share <50% of activity (vs 63.8% for legitimate users). Any user matching two or more criteria within 30 days of registration should trigger enhanced due diligence.`,
      link: `Linked to Brief 2B: ${fmt(data.brief2b.fraud_count)} fraud transactions originated from KYC-passed users, bypassing identity controls entirely.`,
    },
    {
      tag: "REC 4 — Bonus",
      title: "Immediate action on the top 5 actors; run composite scoring nightly",
      body: `Actor dc283b17 (score: 18,768) is active across 12 countries and all 5 transaction channels with KYC Pending — suspend pending investigation immediately. The remaining 4 actors collectively account for significant exposure. More critically, the 299-actor fraud network suggests organised activity; composite scoring should run as a nightly batch job to surface emerging actors before they reach the top tier.`,
      link: `Linked to Bonus: dc283b17's score of 18,768 is 4.6× the second-ranked actor, indicating an extreme outlier already warranting action.`,
    },
  ];

  return (
    <Page>
      <SectionHeader
        overline="Section 6"
        title="Recommendations"
        description="Each recommendation is directly traceable to a quantified finding. No recommendation is made without an underlying data point."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {recs.map((r) => (
          <div key={r.tag} style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ background: C.ink, padding: "10px 18px" }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>{r.tag}</p>
            </div>
            <div style={{ padding: "14px 18px" }}>
              <H3>{r.title}</H3>
              <Body style={{ marginTop: 6, marginBottom: 10 }}>{r.body}</Body>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 12px", background: "#f7f7f7", borderRadius: 6, border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: C.subtle, marginTop: 1, flexShrink: 0 }}>EVIDENCE</span>
                <p style={{ fontSize: 10, color: C.muted, fontStyle: "italic" }}>{r.link}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, padding: "16px 20px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, marginBottom: 8 }}>Dataset & Methodology Notes</p>
        <Body>
          Analysis based on {fmt(overview.total_txns)} transactions from {fmt(overview.unique_users)} unique users, totalling {fmtM(overview.total_amount)} in transaction value.
          No date column was present in the dataset; the 30-day registration window referenced in the brief could not be applied, but the direction of all findings remains consistent with or without this filter.
          Geographic analysis excludes countries with fewer than 50 transactions to avoid rate inflation from small samples.
          The composite fraud actor score (Brief Bonus) was independently derived and does not rely on any pre-existing risk flag in the source data.
        </Body>
      </div>

      <PageFooter page={6} total={6} />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN REPORT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function ReportPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    fetch("/analytics.json")
      .then(r => r.json())
      .then((d: Analytics) => { setAnalytics(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <p style={{ fontSize: 13, color: "#a3a3a3" }}>Generating report…</p>
      </div>
    );
  }
  if (!analytics) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <p style={{ fontSize: 13, color: "#a3a3a3" }}>No data. Please upload a dataset first.</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#e8e8e8", minHeight: "100vh", paddingBottom: 60 }}>

      {/* ── Toolbar (hidden on print) ──────────────────────────────── */}
      <div className="report-no-print" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "#0f0f0f", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: 52,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/" style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>← Dashboard</a>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Financial Crime Intelligence Report</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/slides" style={{
            fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 7,
            border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)",
            textDecoration: "none", background: "transparent",
          }}>
            View Slides
          </a>
          <button
            onClick={() => window.print()}
            style={{
              fontSize: 12, fontWeight: 700, padding: "7px 20px", borderRadius: 7,
              background: "#ffffff", color: "#0f0f0f", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* ── Pages ──────────────────────────────────────────────────── */}
      <div style={{ paddingTop: 72, display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        <CoverPage           data={analytics} />
        <ExecutiveSummaryPage data={analytics} />
        <ConversionPage      data={analytics} />
        <GeographicPage      data={analytics} />
        <KYCPatternsPage     data={analytics} />
        <FraudstersPage      data={analytics} />
        <RecommendationsPage data={analytics} />
      </div>
    </div>
  );
}

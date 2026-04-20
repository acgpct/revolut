"use client";

import { useState, useEffect, Fragment, type ReactNode } from "react";
import MethodHint from "@/components/ui/MethodHint";
import {
  ChartTooltipFromPayload,
  ChartTooltipRoot,
  ChartTooltipTitle,
  ChartTooltipRows,
  ChartTooltipRow,
} from "@/components/ui/ChartTooltip";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer,
} from "recharts";
import type { Analytics } from "@/lib/types";
import { notTrueConvertedUserCount } from "@/lib/brief1Metrics";
import { buildBrief2bMerchantMixRows, merchantMixToChartData } from "@/lib/brief2bMerchantChart";
import FraudstersAuditBlock from "@/components/FraudstersAuditBlock";
import { fmtGbpFromMinor } from "@/lib/gbpMinor";

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

/** Top / horizontal / bottom padding for printable `ContentPage` bodies. Bottom is larger so tables and captions clear the fixed footer in PDF export. */
const REPORT_PAD = { top: "13mm", x: "15mm", bottom: "20mm" } as const;

function ReportGeoTip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { country: string; fraud: number; rate: number; fraud_amount?: number; total?: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <ChartTooltipRoot variant="report" style={{ maxWidth: 228 }}>
      <ChartTooltipTitle variant="report">{d.country}</ChartTooltipTitle>
      <ChartTooltipRows>
        <ChartTooltipRow variant="report" label="Fraud txns" value={fmt(d.fraud)} valueColor={RED} />
        <ChartTooltipRow variant="report" label="Fraud rate" value={`${d.rate}%`} />
        {typeof d.fraud_amount === "number" ? (
          <ChartTooltipRow variant="report" label="Fraud loss" value={fmtM(d.fraud_amount)} valueColor={RED} />
        ) : null}
        {typeof d.total === "number" ? (
          <ChartTooltipRow variant="report" label="Total txns" value={fmt(d.total)} />
        ) : null}
      </ChartTooltipRows>
    </ChartTooltipRoot>
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

// Section header: context + recommendation visible; methodology in Method tooltip only
function SecHead({
  overline,
  title,
  desc,
  methodology,
  recommendation,
}: {
  overline: string;
  title: string;
  desc?: string;
  methodology?: ReactNode;
  recommendation?: string;
}) {
  return (
    <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${RULE}` }}>
      <OL>{overline}</OL>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: desc || recommendation ? 5 : 0 }}>
        <h2 style={{ flex: "1 1 auto", fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: INK, lineHeight: 1.1, margin: 0 }}>{title}</h2>
        {methodology ? <MethodHint label="Method">{methodology}</MethodHint> : null}
      </div>
      {desc && <Body style={{ maxWidth: 580 }}>{desc}</Body>}
      {recommendation && (
        <Body style={{ maxWidth: 580, marginTop: 6, color: INK, fontWeight: 600 }}>
          <strong>Recommendation.</strong> {recommendation}
        </Body>
      )}
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
      <div style={{
        padding: `${REPORT_PAD.top} ${REPORT_PAD.x} ${REPORT_PAD.bottom}`,
        height: "100%",
        boxSizing: "border-box",
        position: "relative",
      }}>
        {children}
      </div>
    </Page>
  );
}

function Footer({ n, total }: { n: number; total: number }) {
  return (
    <div style={{
      position: "absolute",
      bottom: "8mm",
      left: REPORT_PAD.x,
      right: REPORT_PAD.x,
      zIndex: 5,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      borderTop: `1px solid ${RULE}`,
      paddingTop: 6,
      paddingBottom: 1,
      background: WHITE,
    }}>
      <p style={{ fontSize: 7.5, color: SUBTLE, margin: 0, lineHeight: 1.35 }}>Revolut Financial Crime Intelligence · Confidential</p>
      <p style={{ fontSize: 7.5, color: SUBTLE, margin: 0, lineHeight: 1.35 }}>{n} / {total}</p>
    </div>
  );
}

const TOTAL = 10;

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
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", lineHeight: 1.6, maxWidth: 460, marginTop: 14 }}>
          This document is structured so each analytical brief stands alone: what was measured, why it matters for Financial Crime controls, and what to do next.
        </p>

        {/* Dashboard CTA — visible in browser and preserved as a clickable link in print/PDF */}
        <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 20, height: 1, background: "rgba(255,255,255,0.15)" }} />
          <a
            href="https://revolut-three.vercel.app/"
            style={{
              fontSize: 7.5,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            Go to interactive dashboard
            <span style={{ opacity: 0.5, letterSpacing: 0 }}>›</span>
          </a>
        </div>
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
            { l: "Unique Fraud Actors",    v: fmt(d.bonus.total_fraudsters), sub: "composite-scored actors" },
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
          { n: "2", t: "Brief 1 — App Conversion Rate",    s: `Methodology gap: ${d.brief1.marketing_rate}% vs ${d.brief1.revolut_rate}%` },
          { n: "3", t: "Brief 2A — Geographic Risk",       s: "Volume vs rate: two independent threats" },
          { n: "4", t: "Brief 2B — KYC-Passed Fraudsters", s: "Behavioural anomalies identity checks miss" },
          { n: "5", t: "Bonus — Top Fraudster Ranking",    s: `Composite scoring across ${fmt(d.bonus.total_fraudsters)} actors` },
          { n: "6", t: "Recommendations",                  s: "Four actions with quantified cost of inaction" },
          { n: "7", t: "Operator's Lens",                  s: "Priority matrix · Forward-looking exposure model" },
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

  // Derive dynamic geo stats for findings
  const geoByVol  = d.brief2a.geo_risk;
  const geoByRate = [...d.brief2a.geo_risk].sort((a,b) => b.rate - a.rate);
  const hvCountry = geoByVol[0]?.country ?? "—";
  const hvFraud   = geoByVol[0]?.fraud   ?? 0;
  const hvAmt     = geoByVol[0]?.fraud_amount ?? 0;
  const hrCountry = geoByRate[0]?.country ?? "—";
  const hrRate    = geoByRate[0]?.rate    ?? 0;
  const hr1in     = Math.round(100 / (hrRate || 1));

  // ATM / bank-transfer pp delta
  const atmDiff  = (d.brief2b.fraud_type_pct["ATM"]          ?? 0) - (d.brief2b.legit_type_pct["ATM"]          ?? 0);
  const bankDiff = (d.brief2b.fraud_type_pct["BANK_TRANSFER"] ?? 0) - (d.brief2b.legit_type_pct["BANK_TRANSFER"] ?? 0);

  // #1 actor dynamic
  const top1 = d.bonus.top_fraudsters[0];
  const top2 = d.bonus.top_fraudsters[1];
  const scoreRatio = top2 ? (top1.score / top2.score).toFixed(1) : "—";

  const mfLoss = d.brief2a.fraud_amount_merchant_facing ?? 0;
  const pfLoss = d.brief2a.fraud_amount_platform ?? 0;

  const findings = [
    { n:"1", h:`Conversion gap of ${gap}pp`, b:`Marketing's ${brief1.marketing_rate}% counts fraudsters and non-card transactions. The correct rate — KYC-passed + ≥1 legitimate card payment — is ${brief1.revolut_rate}%.` },
    { n:"2", h:"Geographic risk is two-dimensional", b:`${hvCountry} leads by volume (${fmt(hvFraud)} cases, ${fmtM(hvAmt)}). ${hrCountry} carries the highest fraud rate (${hrRate}%) — 1 in ${hr1in} transactions. A single axis hides one threat. Globally, fraud losses split as merchant-facing (card + ATM): ${fmtM(mfLoss)} — geographic controls apply — vs platform (top-up + P2P + bank transfer): ${fmtM(pfLoss)} — velocity and behavioural controls apply.` },
    { n:"3", h:"KYC clearance ≠ legitimacy", b:`${fmt(d.brief2b.fraud_count)} fraud transactions came from KYC-passed users, over-indexing on ATM (+${atmDiff.toFixed(1)}pp) and bank transfers (+${bankDiff.toFixed(1)}pp).` },
    { n:"4", h:`One actor: ${fmtGbpFromMinor(top1?.amount ?? 0)} across ${top1?.countries_hit ?? 0} countries`, b:`${top1?.full_id.slice(0,8) ?? "—"} executed ${fmt(top1?.txns ?? 0)} transactions across all ${top1?.types_used ?? 0} channels. Risk score ${(top1?.score ?? 0).toFixed(1)} — ${scoreRatio}× the second-ranked actor.` },
  ];

  return (
    <ContentPage>
      <SecHead
        overline="Section 1"
        title="Executive Summary"
        desc="Four analytical briefs surface four distinct fraud risks across conversion, geography, post-KYC behaviour, and persistent actors. Each risk has a different control owner: Growth analytics, Geo / merchant risk, Transaction monitoring, and Investigations."
        methodology={
          <>
            <p style={{ fontWeight: 700, color: INK, marginBottom: 6 }}>How to read this section</p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              The KPI strip below summarises the whole book. Figure 1 shows where fraud concentrates by <em>volume</em> (raw transaction counts), not by rate — high bars are not automatically the highest-risk channels.
            </p>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              The numbered findings mirror Sections 2–5 in order; use each section for charts, tables, and the tied recommendation.
            </p>
          </>
        }
      />

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
            <Tooltip
              content={(props) => <ChartTooltipFromPayload {...props} variant="report" />}
              cursor={{ fill: "#f8f8f8" }}
            />
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
  const excluded = fmt(notTrueConvertedUserCount(brief1));
  const total    = brief1.unique_users;

  const funnel = [
    { l: "Registered Users",         v: brief1.unique_users,            p: 100 },
    { l: "Topped Up",                v: brief1.topup_users,             p: Math.round(brief1.topup_users/total*100) },
    { l: "KYC Passed",               v: brief1.kyc_passed_users,        p: Math.round(brief1.kyc_passed_users/total*100) },
    { l: "Legitimate Card Payment",  v: brief1.legit_card_users,        p: Math.round(brief1.legit_card_users/total*100) },
    { l: "Revolut Converted (true)", v: brief1.revolut_converted_users, p: Math.round(brief1.revolut_converted_users/total*100) },
  ];

  const btType   = fraud_by_type.find(t => t.type === "BANK_TRANSFER");
  const rateData = [...fraud_by_type].sort((a,b)=>b.rate-a.rate).map(t => ({
    name: t.type.replace("CARD_PAYMENT","Card Pay.").replace("BANK_TRANSFER","Transfer").replace(/_/g," "),
    rate: t.rate,
  }));

  return (
    <ContentPage>
      <SecHead
        overline="Section 2 — Brief 1"
        title="App Conversion Rate"
        desc="Marketing overstates conversion by inflating the numerator with fraudsters and non-card transactions. The only meaningful signal is KYC clearance + a legitimate card payment. Board-level conversion used for acquisition spend on the wrong denominator silently funds accounts that will never yield interchange."
        recommendation={`Publish a single “true conversion” KPI (${brief1.revolut_rate}%) alongside marketing reach (${brief1.marketing_rate}%) in investor and internal growth packs. Add a data-quality gate so any card counted toward conversion must be non-fraud and tied to a KYC-passed user — otherwise acquisition targets and fraud budgets drift in opposite directions.`}
        methodology={
          <>
            <p style={{ fontWeight: 700, color: INK, marginBottom: 6 }}>KPI definitions</p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <strong>Marketing (incorrect for revenue).</strong> Card users (including fraudulent card payments) ÷ KYC-attempted users — a smaller denominator than all registered users, with a numerator that does not map to interchange revenue.
            </p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <strong>Revolut (correct).</strong> KYC-passed + ≥1 legitimate card payment — the only transaction type generating interchange revenue and signalling a primary account relationship.
            </p>
            <p style={{ fontWeight: 700, color: INK, marginBottom: 6 }}>Figures 2–3</p>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              Figure 3 is platform-wide fraud <em>rate</em> by channel (“where does a random transaction of this type go bad?”); the funnel is “how far did real users get?”. Bank transfer elevation bridges to Brief 2B: high transfer rates are behavioural / velocity, not geography alone.
            </p>
          </>
        }
      />

      {/* The big comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 14 }}>
        <div style={{ borderTop: `1.5px solid ${RULE}`, paddingTop: 10 }}>
          <OL>Marketing Definition · Incorrect</OL>
          <p style={{ fontSize: 54, fontWeight: 900, letterSpacing: "-0.05em", color: "#d0d0d0", lineHeight: 1, marginBottom: 6 }}>{brief1.marketing_rate}%</p>
        </div>
        <div style={{ borderTop: `1.5px solid ${INK}`, paddingTop: 10 }}>
          <OL>Revolut Definition · Correct</OL>
          <p style={{ fontSize: 54, fontWeight: 900, letterSpacing: "-0.05em", color: INK, lineHeight: 1, marginBottom: 6 }}>{brief1.revolut_rate}%</p>
        </div>
      </div>

      <Insight>
        <strong style={{ color: INK }}>The {gap}pp gap is structural.</strong> Marketing&apos;s definition counts <strong style={{ color: INK }}>{excluded} users</strong> generating zero interchange revenue. Without a date column in the dataset no 30-day window can be applied, but the directional impact is clear.
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
              <YAxis type="category" dataKey="name" interval={0} tick={{ fill: MUTED, fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={58} />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <ChartTooltipRoot variant="report">
                      {label != null && label !== "" && <ChartTooltipTitle variant="report">{label}</ChartTooltipTitle>}
                      <ChartTooltipRows>
                        <ChartTooltipRow variant="report" label="Fraud rate" value={`${payload[0].value}%`} valueColor={RED} />
                      </ChartTooltipRows>
                    </ChartTooltipRoot>
                  ) : null
                }
                cursor={{ fill: "#f8f8f8" }}
              />
              <Bar dataKey="rate" radius={[0,3,3,0]}>
                {rateData.map(e => <Cell key={e.name} fill={e.rate > 5 ? RED : e.rate > 2 ? "#e8a000" : INK} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 8.5, fontWeight: 700, color: RED, borderTop: `1px solid #fdd`, paddingTop: 6, marginTop: 4 }}>
            Bank Transfer: {btType?.rate}% — {btType ? (btType.rate / (d.overview.fraud_rate || 1)).toFixed(1) : "—"}× the platform average ({d.overview.fraud_rate}%)
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
// Compact label for chart axes — keeps all ticks the same width
const shortLabel = (c: string) => c === "Unknown / Null" ? "N/A" : c;

function GeographicRisk({ d }: { d: Analytics }) {
  const geo    = d.brief2a.geo_risk;
  const top8   = geo.slice(0, 8);
  const byRate = [...geo].sort((a,b)=>b.rate-a.rate).slice(0, 8);
  const hv = geo[0], hr = byRate[0];
  const mfLoss = d.brief2a.fraud_amount_merchant_facing ?? 0;
  const pfLoss = d.brief2a.fraud_amount_platform ?? 0;
  const otherLoss = d.brief2a.fraud_amount_other_channels ?? 0;
  const btPlat = d.fraud_by_type.find((t) => t.type === "BANK_TRANSFER");

  // Map to short labels for chart axes only
  const top8Chart   = top8.map(r   => ({ ...r, country: shortLabel(r.country) }));
  const byRateChart = byRate.map(r => ({ ...r, country: shortLabel(r.country) }));

  return (
    <ContentPage>
      <SecHead
        overline="Section 3 — Brief 2A"
        title="Geographic Risk Exposure"
        desc="Fraud risk has two dimensions: attack count (volume) and attack probability (rate). Conflating them leads to under-investment in high-rate markets."
        recommendation="Keep two live country views—fraud count vs fraud rate—with separate owners and escalation paths. Route merchant-facing cuts (card + ATM) to acquiring and card risk; route platform loss to TM rule tuning with Brief 2B. Review the ≥50-transactions-per-country floor at least quarterly as volumes grow."
        methodology={
          <>
            <p style={{ fontWeight: 700, color: INK, marginBottom: 6 }}>Data & lens</p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              Charts and tables use <code>MERCHANT_COUNTRY</code> on each row (where present). Countries with fewer than fifty transactions are excluded so small-sample noise does not drive policy.{" "}
              <sup>†</sup> “Unknown / Null” = transactions where <code>MERCHANT_COUNTRY</code> was not recorded.
            </p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <strong>Why this section exists.</strong> A single heat map optimises for operational load (where are we busy?) but can miss jurisdictions where fraud is rare yet highly concentrated. The merchant-facing vs platform split clarifies terminal/corridor limits vs velocity and counterparty screening.
            </p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <strong>Merchant-facing fraud · CARD + ATM.</strong> Sum of fraud-ticket <code>AMOUNT</code> where <code>TYPE</code> is card payment or ATM — geographic and POS controls are the primary lens.
            </p>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              <strong>Platform fraud · TOPUP + P2P + bank transfer.</strong> Sum of fraud <code>AMOUNT</code> on on-rail movements. Brief 2B&apos;s bank-transfer over-index ({btPlat?.rate ?? "—"}% platform fraud rate) sits here — velocity, counterparty, and post-onboarding behavioural rules, not merchant-country tiles alone.
            </p>
          </>
        }
      />

      {/* 4 KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 18px", marginBottom: 16 }}>
        <Kpi label="Highest Volume"  value={hv.country} sub={`${fmt(hv.fraud)} fraud txns`} />
        <Kpi label="Volume Losses"   value={fmtM(hv.fraud_amount)} sub={`${hv.rate}% rate`} red />
        <Kpi label="Highest Rate"    value={hr.country} sub={`${hr.rate}% of all txns`} red />
        <Kpi label="1 in every"      value={`${Math.round(100/(hr.rate||1))}`} sub="transactions is fraudulent" red />
      </div>

      {/* Fraud loss split: merchant-facing vs platform (complements MERCHANT_COUNTRY geo) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ border: `1px solid ${INK}`, borderRadius: 6, padding: "10px 14px", background: "#fafafa" }}>
          <OL>Merchant-facing fraud · CARD + ATM</OL>
          <p style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em", color: INK, lineHeight: 1.1, marginBottom: 6 }}>{fmtM(mfLoss)}</p>
        </div>
        <div style={{ border: `1px solid ${RED}`, borderRadius: 6, padding: "10px 14px", background: "#fffafa" }}>
          <OL>Platform fraud · TOPUP + P2P + bank transfer</OL>
          <p style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em", color: RED, lineHeight: 1.1, marginBottom: 6 }}>{fmtM(pfLoss)}</p>
        </div>
      </div>
      {otherLoss > 0 && (
        <p style={{ fontSize: 7.5, color: SUBTLE, marginTop: -8, marginBottom: 12 }}>
          Other channel fraud (outside the five canonical types): {fmtM(otherLoss)}.
        </p>
      )}

      {/* Dual bar charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 14 }}>
        <div>
          <ChartLabel>Figure 4 — Top 8 by Fraud Volume</ChartLabel>
          <ResponsiveContainer width="100%" height={192}>
            <BarChart data={top8} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: SUBTLE, fontSize: 8, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="country" interval={0} tick={{ fill: MUTED, fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<ReportGeoTip />} cursor={{ fill: "#f8f8f8" }} />
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
              <YAxis type="category" dataKey="country" interval={0} tick={{ fill: MUTED, fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<ReportGeoTip />} cursor={{ fill: "#f8f8f8" }} />
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
      <Insight>
        <strong style={{ color: INK }}>{hv.country} vs {byRate[0]?.country} requires a dual-axis model.</strong>{" "}
        {hv.country} accounts for {Math.round((hv.fraud / geo.reduce((s,g)=>s+g.fraud,0))*100)}% of fraud by volume ({fmtM(hv.fraud_amount)} lost) — operational priority.{" "}
        {byRate[0]?.country}&apos;s {byRate[0]?.rate}% rate signals a structurally different fraud vector requiring separate controls.{" "}
        The merchant-facing vs platform split above reconciles geographic dashboards with Brief 2B: bank-transfer risk is counted in the <strong style={{ color: INK }}>platform</strong> bucket ({fmtM(pfLoss)}), so high transfer rates inform velocity rules even when merchant maps look calm.
      </Insight>

      <Footer n={5} total={TOTAL} />
    </ContentPage>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGES 6–7 — BRIEF 2B (TABLES 1–2 → TABLE 3 + FIGURES 7–8 / NARRATIVE)
// ═══════════════════════════════════════════════════════════════════════════════
function KYCPatterns({ d }: { d: Analytics }) {
  const { brief2b, fraud_by_type, kyc_status, kyc_fraud_status } = d;
  const fraudMed = brief2b.fraud_median_txn_amount ?? brief2b.fraud_avg_amount;
  const legitMed = brief2b.legit_median_txn_amount ?? brief2b.legit_avg_amount;
  const fraudBirthMed = brief2b.fraud_median_birth_year ?? brief2b.fraud_avg_birth;
  const legitBirthMed = brief2b.legit_median_birth_year ?? brief2b.legit_avg_birth;
  const fraudTop = brief2b.kyc_fraud_merchant_top ?? [];
  const legitTop = brief2b.kyc_legit_merchant_top ?? [];
  const merchantRows = buildBrief2bMerchantMixRows(fraudTop, legitTop, 10);
  const merchantChartData = merchantMixToChartData(merchantRows);
  const pendingTot = kyc_status.PENDING ?? 0;
  const pendingFraud = kyc_fraud_status.PENDING ?? 0;
  const failedTot = kyc_status.FAILED ?? 0;
  const failedFraud = kyc_fraud_status.FAILED ?? 0;
  const pendingFraudRate = pendingTot ? Math.round((pendingFraud / pendingTot) * 10000) / 100 : 0;
  const failedFraudRate = failedTot ? Math.round((failedFraud / failedTot) * 10000) / 100 : 0;

  const fAtm = brief2b.fraud_type_pct["ATM"] ?? 0;
  const lAtm = brief2b.legit_type_pct["ATM"] ?? 0;
  const fTop = brief2b.fraud_type_pct["TOPUP"] ?? 0;
  const lTop = brief2b.legit_type_pct["TOPUP"] ?? 0;
  const fCard = brief2b.fraud_type_pct["CARD_PAYMENT"] ?? 0;
  const lCard = brief2b.legit_type_pct["CARD_PAYMENT"] ?? 0;
  const medAmtDiff = fraudMed - legitMed;
  const cohortPatternRows = [
    { label: "Median txn amount (fraud- vs legit-labelled txns)", f: fmtM(fraudMed), l: fmtM(legitMed), d: `${medAmtDiff >= 0 ? "+" : "−"}${fmtM(Math.abs(medAmtDiff))}` },
    { label: "ATM share", f: `${fAtm}%`, l: `${lAtm}%`, d: `${(fAtm - lAtm) >= 0 ? "+" : ""}${(fAtm - lAtm).toFixed(1)}pp` },
    { label: "Top-up share", f: `${fTop}%`, l: `${lTop}%`, d: `${(fTop - lTop) >= 0 ? "+" : ""}${(fTop - lTop).toFixed(1)}pp` },
    { label: "Card payment share", f: `${fCard}%`, l: `${lCard}%`, d: `${(fCard - lCard) >= 0 ? "+" : ""}${(fCard - lCard).toFixed(1)}pp` },
    { label: "Median birth year (per user)", f: String(fraudBirthMed), l: String(legitBirthMed), d: `${fraudBirthMed - legitBirthMed >= 0 ? "+" : ""}${fraudBirthMed - legitBirthMed}` },
    { label: "Avg merchant countries attacked / user", f: String(brief2b.fraud_avg_countries), l: String(brief2b.legit_avg_countries), d: `${(brief2b.fraud_avg_countries - brief2b.legit_avg_countries).toFixed(1)}` },
    { label: "Avg txns / user (cohort)", f: String(brief2b.fraud_avg_txns_per_user), l: String(brief2b.legit_avg_txns_per_user), d: `${(brief2b.fraud_avg_txns_per_user - brief2b.legit_avg_txns_per_user).toFixed(1)}` },
  ];

  const txnTypes = ["CARD_PAYMENT","TOPUP","ATM","BANK_TRANSFER","P2P"];
  const shortL: Record<string,string> = { CARD_PAYMENT:"Card", TOPUP:"Top-up", ATM:"ATM", BANK_TRANSFER:"Transfer", P2P:"P2P" };

  const radarData = txnTypes.map(t => ({
    type: shortL[t],
    Fraud:      brief2b.fraud_type_pct[t] || 0,
    Legitimate: brief2b.legit_type_pct[t] || 0,
  }));

  const btRate  = fraud_by_type.find(t => t.type === "BANK_TRANSFER");
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
    <Fragment>
    <ContentPage>
      <SecHead
        overline="Section 4 — Brief 2B"
        title="KYC-Passed Fraudsters"
        desc={`${fmt(brief2b.fraud_count)} fraud-labelled transactions from KYC-cleared users show where behaviour diverges after identity checks — before balances exit the platform.`}
        recommendation={`Stand up velocity on top-up followed by ATM or bank transfer, and tighten limits while KYC remains PENDING: fraud labelled on ${pendingFraudRate}% of PENDING transactions (${fmt(pendingFraud)} / ${fmt(pendingTot)}) vs ${failedFraudRate}% on FAILED (${fmt(failedFraud)} / ${fmt(failedTot)}). Pair channel mix rules with merchant-country anomalies from Table 2 and the Table 3 signals to catch “top-up and extract” paths.`}
        methodology={
          <>
            <p style={{ fontWeight: 700, color: INK, marginBottom: 6 }}>Cohort & table construction</p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <strong>Fraud cohort</strong>: KYC-passed users with at least one fraud-labelled transaction. <strong>Legit cohort</strong>: KYC-passed users with no fraud history. Tables compare fraud-labelled vs legitimate-labelled <em>transactions</em> within those user sets — not all fraud on the platform.
            </p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <strong>Table 1.</strong> Medians dampen outlier heists. Channel shares are % of each cohort’s labelled transactions (fraud rows only in the fraud column; legitimate rows only in the legit column). Use with Table 2: country skew without channel skew often points to merchant compromise; channel skew with many countries points to mule or cash-out behaviour.
            </p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <strong>Table 2.</strong> “Merchant country” is <code>MERCHANT_COUNTRY</code> across all movements for users in each cohort (not only card spend).
            </p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <strong>Table 3.</strong> Same channel mix as Figure 7 as percentage-point distance from the legitimate KYC-passed baseline. “Anomalous” flags |gap| &gt; 2pp — a pragmatic screen for rule design, not a statistical test.
            </p>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              The next page opens with Table 3, then Figures 7–8 and the footprint interpretation, after Tables 1–2.
            </p>
          </>
        }
      />

      <p style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: SUBTLE, marginBottom: 4 }}>
        Table 1 — Shared behavioural patterns (KYC-passed cohorts)
      </p>
      <table style={{ width: "100%", fontSize: 8.5, borderCollapse: "collapse", marginBottom: 10 }}>
        <thead>
          <tr style={{ borderBottom: `1.5px solid ${INK}` }}>
            {["Metric", "Fraud cohort", "Legit cohort", "Δ / skew"].map((h) => (
              <th key={h} style={{ padding: "3px 8px", textAlign: "left", fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: SUBTLE }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohortPatternRows.map((row) => (
            <tr key={row.label} style={{ borderBottom: `1px solid ${RULE}` }}>
              <td style={{ padding: "5px 8px", fontWeight: 600, color: INK }}>{row.label}</td>
              <td style={{ padding: "5px 8px", fontWeight: 700, color: RED }}>{row.f}</td>
              <td style={{ padding: "5px 8px", color: MUTED }}>{row.l}</td>
              <td style={{ padding: "5px 8px", fontWeight: 700, color: MUTED }}>{row.d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: SUBTLE, marginBottom: 4 }}>
        Table 2 — Merchant country mix (% of cohort transactions)
      </p>
      <table style={{ width: "100%", fontSize: 8.5, borderCollapse: "collapse", marginBottom: 10 }}>
        <thead>
          <tr style={{ borderBottom: `1.5px solid ${INK}` }}>
            {["Merchant country", "Fraud cohort %", "Fraud n", "Legit cohort %", "Legit n"].map((h) => (
              <th key={h} style={{ padding: "3px 8px", textAlign: "left", fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: SUBTLE }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {merchantRows.map((row) => (
            <tr key={row.country} style={{ borderBottom: `1px solid ${RULE}` }}>
              <td style={{ padding: "5px 8px", fontWeight: 600, color: INK }}>{row.country}</td>
              <td style={{ padding: "5px 8px", fontWeight: 700, color: RED }}>{row.fraudPct}%</td>
              <td style={{ padding: "5px 8px", color: MUTED }}>{fmt(row.fraudN)}</td>
              <td style={{ padding: "5px 8px", color: MUTED }}>{row.legitPct}%</td>
              <td style={{ padding: "5px 8px", color: MUTED }}>{fmt(row.legitN)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ChartLabel>Figure 6 — Merchant country distribution (share of cohort transactions, %)</ChartLabel>
      <ResponsiveContainer width="100%" height={136}>
        <BarChart data={merchantChartData} margin={{ top: 2, right: 6, left: -18, bottom: 32 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: SUBTLE, fontSize: 7, fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-22}
            textAnchor="end"
            height={40}
          />
          <YAxis
            tick={{ fill: SUBTLE, fontSize: 7, fontFamily: "inherit" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
            width={26}
          />
          <Tooltip
            content={(props) =>
              props.active && props.payload?.length ? (
                <ChartTooltipFromPayload {...props} variant="report" formatValue={(v) => `${Number(v).toFixed(1)}%`} />
              ) : null
            }
            cursor={{ fill: "#f8f8f8" }}
          />
          <Legend wrapperStyle={{ fontSize: 7, color: SUBTLE, paddingTop: 2 }} />
          <Bar name="Fraud cohort" dataKey="fraudsters" fill={RED} radius={[2, 2, 0, 0]} maxBarSize={12} />
          <Bar name="Legit cohort" dataKey="legitimate" fill={INK} radius={[2, 2, 0, 0]} maxBarSize={12} />
        </BarChart>
      </ResponsiveContainer>

      <Footer n={6} total={TOTAL} />
    </ContentPage>

    <ContentPage>
      <div style={{ marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${RULE}` }}>
        <OL>Section 4 — Brief 2B</OL>
        <p style={{ fontSize: 10, fontWeight: 700, color: INK, letterSpacing: "-0.01em", marginTop: 4, marginBottom: 0 }}>
          Channel signals & mix
        </p>
        <Body style={{ fontSize: 8.5, marginTop: 4, marginBottom: 0, color: SUBTLE }}>
          Tables 1–2 on the prior page. Table 3 lists percentage-point deviations from the legitimate baseline; Figures 7–8 show the same cohort mix and platform-wide fraud rates by channel.
        </Body>
      </div>

      <p style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: SUBTLE, marginTop: 0, marginBottom: 6 }}>
        Table 3 — Behavioural Signals: pp Deviation from Legitimate Baseline
      </p>
      <table style={{ width: "100%", fontSize: 8, borderCollapse: "collapse", marginBottom: 16 }}>
        <thead>
          <tr style={{ borderBottom: `1.5px solid ${INK}` }}>
            {["Signal","Fraud (%)","Legit (%)","Diff (pp)","Anomalous"].map(h => (
              <th key={h} style={{ padding: "2px 6px", textAlign: "left", fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: SUBTLE }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {signals.map((s) => {
            const diff = s.f - s.lg;
            const anom = Math.abs(diff) > 2;
            return (
              <tr key={s.l} style={{ borderBottom: `1px solid ${RULE}` }}>
                <td style={{ padding: "4px 6px", fontWeight: 600, color: INK }}>{s.l}</td>
                <td style={{ padding: "4px 6px", fontWeight: 700, color: RED }}>{s.f}%</td>
                <td style={{ padding: "4px 6px", color: MUTED }}>{s.lg}%</td>
                <td style={{ padding: "4px 6px", fontWeight: 700, color: diff > 0 ? RED : MUTED }}>{diff>0?"+":""}{diff.toFixed(1)}pp</td>
                <td style={{ padding: "4px 6px" }}>
                  {anom ? <span style={{ fontSize: 7.5, fontWeight: 700, color: RED }}>● Yes</span>
                        : <span style={{ fontSize: 7.5, color: SUBTLE }}>No</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 6, marginBottom: 14 }}>
        <div>
          <ChartLabel>Figure 7 — Transaction Mix: Fraud vs Legitimate (%)</ChartLabel>
          <ResponsiveContainer width="100%" height={142}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={RULE} />
              <PolarAngleAxis dataKey="type" tick={{ fill: MUTED, fontSize: 9, fontFamily: "inherit" }} />
              <Radar name="Fraud"      dataKey="Fraud"      stroke={RED}  fill={RED}  fillOpacity={0.1} />
              <Radar name="Legitimate" dataKey="Legitimate" stroke={INK}  fill={INK}  fillOpacity={0.05} />
              <Legend wrapperStyle={{ fontSize: 9, color: SUBTLE, paddingTop: 2 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <ChartLabel>Figure 8 — Fraud Rate by Channel (%)</ChartLabel>
          <ResponsiveContainer width="100%" height={118}>
            <BarChart data={rateData} margin={{ top: 2, right: 16, left: -16, bottom: 24 }}>
              <XAxis dataKey="name" tick={{ fill: SUBTLE, fontSize: 8, fontFamily: "inherit" }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={36} />
              <YAxis tick={{ fill: SUBTLE, fontSize: 8, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <ChartTooltipRoot variant="report">
                      {label != null && label !== "" && <ChartTooltipTitle variant="report">{label}</ChartTooltipTitle>}
                      <ChartTooltipRows>
                        <ChartTooltipRow variant="report" label="Fraud rate" value={`${payload[0].value}%`} valueColor={RED} />
                      </ChartTooltipRows>
                    </ChartTooltipRoot>
                  ) : null
                }
                cursor={{ fill: "#f8f8f8" }}
              />
              <Bar dataKey="rate" radius={[3,3,0,0]}>
                {rateData.map(e => <Cell key={e.name} fill={e.rate>5?RED:e.rate>2?"#e8a000":INK} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 8, fontWeight: 700, color: RED, borderTop: `1px solid #fdd`, paddingTop: 4 }}>
            Bank Transfer: {btRate?.rate}% — highest of any channel
          </p>
        </div>
      </div>

      <Insight>
        {(() => {
          const atmD  = ((brief2b.fraud_type_pct["ATM"]          ?? 0) - (brief2b.legit_type_pct["ATM"]          ?? 0)).toFixed(1);
          const bankD = ((brief2b.fraud_type_pct["BANK_TRANSFER"] ?? 0) - (brief2b.legit_type_pct["BANK_TRANSFER"] ?? 0)).toFixed(1);
          const cardD = ((brief2b.fraud_type_pct["CARD_PAYMENT"]  ?? 0) - (brief2b.legit_type_pct["CARD_PAYMENT"]  ?? 0)).toFixed(1);
          return (
            <>
              <strong style={{ color: INK }}>Fraudsters leave a detectable footprint.</strong>{" "}
              They over-index on ATM (+{atmD}pp) and bank transfers (+{bankD}pp) while under-indexing on card payments ({cardD}pp).{" "}
              Median birth year {fraudBirthMed} (fraud) vs {legitBirthMed} (legit). Merchant-country concentration differs materially between cohorts (Table 2).
            </>
          );
        })()}
      </Insight>

      <Footer n={7} total={TOTAL} />
    </ContentPage>
    </Fragment>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 8 — TOP FRAUDSTERS
// ═══════════════════════════════════════════════════════════════════════════════
function TopFraudsters({ d }: { d: Analytics }) {
  const { bonus } = d;
  const top5 = bonus.top_fraudsters;
  const top1 = top5[0];

  const amountGbp = top1 ? top1.amount / 100 : 0;
  const avgTxnGbp = top1 && top1.txns ? amountGbp / top1.txns : 0;
  const dailyRate   = top1 ? top1.txns / 180 : 0;
  const proj30dGbp  = top1 ? Math.round(dailyRate * 30 * avgTxnGbp) : 0;

  return (
    <ContentPage>
      <SecHead
        overline="Section 5 — Bonus"
        title="Top Fraudster Prioritisation"
        desc={`Naive £ ranking answers “who lost the most today”; composite scoring across ${fmt(bonus.total_fraudsters)} actors answers “who will still be moving money tomorrow if left untouched”.`}
        recommendation="Run the composite nightly on the full fraud-user population and auto-queue the top decile for enhanced review. For the #1 actor, treat channel diversity plus cross-border use as a hard escalation — static limits rarely catch users who are already active on every rail."
        methodology={
          <>
            <p style={{ fontWeight: 700, color: INK, marginBottom: 6 }}>Composite score (fin_crime_audit.pdf)</p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              0.35·fraud value + 0.30·fraud txn count + 0.15·user fraud rate + 0.10·type diversity + 0.10·country diversity — each input normalised 0–1 across all fraud actors. Displayed score is 0–100. Naive £ ranking is shown alongside for contrast. GBP = <code>AMOUNT</code> ÷ 100.
            </p>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              <strong>Context.</strong> Many stacks sort by lifetime loss — fine for reimbursement but underweight slow-burn actors who diversify across rails. The composite rewards persistence, user-level fraud rate, and breadth because those behaviours evade one-channel rules.
            </p>
          </>
        }
      />

      <div style={{ marginBottom: 12 }}>
        <FraudstersAuditBlock
          composite={top5}
          byAmount={bonus.top_fraudsters_by_amount}
          variant="print"
          totalFraudsters={bonus.total_fraudsters}
        />
      </div>

      {top1 && (
        <div style={{ marginTop: 10, padding: "8px 14px", borderLeft: `2px solid ${RED}`, background: "#fafafa" }}>
          <p style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: RED, marginBottom: 4 }}>30-Day Forward Projection</p>
          <Body>
            At <strong style={{ color: INK }}>{top1.full_id.slice(0,8)}</strong>&apos;s current run rate of {fmt(top1.txns)} transactions generating {fmtGbpFromMinor(top1.amount)}, and assuming this dataset reflects a 6-month observation window (approximately {dailyRate.toFixed(1)} transactions per day at {fmtGbpFromMinor(Math.round(avgTxnGbp * 100))} average),{" "}
            <strong style={{ color: RED }}>30 additional days without intervention projects {fmtGbpFromMinor(Math.round(proj30dGbp * 100))} in further exposure.</strong>{" "}
            With all {top1.types_used} transaction channels already active across {top1.countries_hit} countries, velocity — not footprint expansion — is the only remaining detection window.
          </Body>
        </div>
      )}

      <Footer n={8} total={TOTAL} />
    </ContentPage>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 9 — RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════════
function Recommendations({ d }: { d: Analytics }) {
  const { brief1, overview, brief2b, bonus, kyc_status, kyc_fraud_status } = d;
  const gap = (brief1.marketing_rate - brief1.revolut_rate).toFixed(1);
  const pendingTot = kyc_status.PENDING ?? 0;
  const pendingFraud = kyc_fraud_status.PENDING ?? 0;
  const pendingFraudRate = pendingTot ? Math.round((pendingFraud / pendingTot) * 10000) / 100 : 0;

  // Geo-derived values
  const geoByVol  = d.brief2a.geo_risk;
  const geoByRate = [...d.brief2a.geo_risk].sort((a,b) => b.rate - a.rate);
  const hvC = geoByVol[0];
  const hrC = geoByRate[0];
  const rateRatio = hvC && hrC ? (hrC.rate / (hvC.rate || 1)).toFixed(1) : "—";

  // ATM / bank-transfer pp deltas
  const atmD  = ((brief2b.fraud_type_pct["ATM"]          ?? 0) - (brief2b.legit_type_pct["ATM"]          ?? 0)).toFixed(1);
  const bankD = ((brief2b.fraud_type_pct["BANK_TRANSFER"] ?? 0) - (brief2b.legit_type_pct["BANK_TRANSFER"] ?? 0)).toFixed(1);

  // Top-actor values
  const top1 = bonus.top_fraudsters[0];
  const top2 = bonus.top_fraudsters[1];
  const scoreRatio = top2 ? (top1.score / top2.score).toFixed(1) : "—";

  // Cost of inaction computations
  const ghostUsers    = notTrueConvertedUserCount(brief1);
  const kycFraudTotal = brief2b.fraud_count * brief2b.fraud_avg_amount;
  const top5Total     = bonus.top_fraudsters.reduce((s: number, f) => s + f.amount, 0);

  const recs = [
    {
      tag:"REC 1 · Brief 1",
      title:`Retire the ${brief1.marketing_rate}% conversion metric`,
      body:`Replace with ${brief1.revolut_rate}% — KYC-passed users with ≥1 legitimate card payment, the only signal of a revenue-positive primary account. Marketing's definition currently counts ${fmt(ghostUsers)} users who generate zero interchange revenue. Elaboration: align Finance, Growth, and FC so every funnel dashboard uses the same numerator; otherwise CAC payback models inherit optimistic user counts while fraud and credit teams see the true tail.`,
      ev:`${fmt(ghostUsers)} users excluded under the correct definition.`,
      cost:`At £90 annual ARPU — a conservative industry benchmark for neobank interchange revenue — those ${fmt(ghostUsers)} ghost conversions represent ~${fmtM(ghostUsers * 90)} in phantom revenue per cohort — a planning error that compounds with every acquisition campaign.`,
    },
    {
      tag:"REC 2 · Brief 2A",
      title:"Dual-axis geographic risk model",
      body:`Track ${hvC?.country} (volume: ${fmt(hvC?.fraud)} cases) and ${hrC?.country} (rate: ${hrC?.rate}%) on separate KPI dashboards with independent alert thresholds. A single volume-based view hides ${hrC?.country}'s rate — ${rateRatio}× higher. Pair the map with a channel-class split: merchant-facing (card + ATM) ${fmtM(d.brief2a.fraud_amount_merchant_facing ?? 0)} vs platform (top-up + P2P + transfer) ${fmtM(d.brief2a.fraud_amount_platform ?? 0)} so Brief 2B transfer signals are not misread as purely geographic. Elaboration: assign an owner for each axis (e.g. acquiring for volume, FC policy for rate) and review thresholds after every major product launch that shifts transaction mix.`,
      ev:`${hrC?.country} fraud rate ${hrC?.rate}% vs ${hvC?.country} ${hvC?.rate}% at a fraction of the volume.`,
      cost:`${hrC?.country}'s ${hrC?.rate}% rate represents ${fmtM(hrC?.fraud_amount ?? 0)} in losses that targeted rate-based controls would have elevated to tier-1 priority.`,
    },
    {
      tag:"REC 3 · Brief 2B",
      title:"Layer behavioural rules on top of KYC",
      body:`Flag users where ATM share >25% (+${atmD}pp above baseline), bank transfer >15% (+${bankD}pp), or card payment <45%. Two or more signals within 30 days of registration should trigger enhanced due diligence. Add velocity on top-up → ATM / transfer paths and materially lower outbound limits while KYC is PENDING: in this extract, ${pendingFraudRate}% of PENDING-tagged transactions are fraud-labelled (${fmt(pendingFraud)} of ${fmt(pendingTot)}), so “wait for KYC” is not a risk-neutral state.`,
      ev:`${fmt(brief2b.fraud_count)} fraud txns from KYC-passed users bypassed identity controls entirely.`,
      cost:`${fmt(brief2b.fraud_count)} fraud transactions × £${(brief2b.fraud_avg_amount/1000).toFixed(1)}K average = ${fmtM(Math.round(kycFraudTotal))} in losses that post-onboarding behavioural rules would have intercepted.`,
    },
    {
      tag:"REC 4 · Bonus",
      title:"Immediate action + nightly composite scoring",
      body:`Suspend ${top1?.full_id.slice(0,8)} (${scoreRatio}× second-ranked) immediately. Run composite scoring nightly across all ${fmt(bonus.total_fraudsters)} actors to surface emerging high-risk profiles before losses compound. Elaboration: publish the score and its four inputs to investigators so overrides are auditable; refresh inputs when new rails or corridors launch so the model does not silently go stale.`,
      ev:`${top1?.full_id.slice(0,8)}: ${fmt(top1?.txns)} txns across ${top1?.countries_hit} countries.`,
      cost:`Top 5 actors combined: ${fmtGbpFromMinor(top5Total)} at risk. Every day without nightly scoring is a day the ranked list goes un-actioned.`,
    },
  ];

  return (
    <ContentPage>
      <SecHead
        overline="Section 6"
        title="Recommendations"
        desc="Four priority controls with evidence and blunt cost-of-inaction lines — agenda material for a joint Growth / Risk / Engineering forum."
        recommendation="Ship REC 1–2 reporting hygiene in parallel with REC 3–4 loss containment: fast fixes restore a single source of truth; rules and actor suspension stop compounding exposure."
        methodology={
          <>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <strong>How to read each block.</strong> The body states the control change; evidence ties back to charts/tables in Sections 2–5; the cost line is opportunity loss from not shipping that control, not a precise forecast.
            </p>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              <strong>Dataset notes.</strong> {fmt(overview.total_txns)} transactions · {fmt(overview.unique_users)} unique users · {fmtM(overview.total_amount)} total volume. No date column — 30-day registration window not applied. Geographic analysis excludes countries with &lt;50 transactions; <code>MERCHANT_COUNTRY</code> nulls labelled “Unknown / Null”. Composite fraud-actor score derived without reliance on pre-existing risk flags.
            </p>
          </>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {recs.map((r, i) => (
          <div key={r.tag} style={{ paddingTop: 10, paddingBottom: 10, borderBottom: `1px solid ${RULE}` }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ minWidth: 3, alignSelf: "stretch", background: i === 0 ? INK : RULE, borderRadius: 99, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: SUBTLE, marginBottom: 3 }}>{r.tag}</p>
                <p style={{ fontSize: 11.5, fontWeight: 800, color: INK, letterSpacing: "-0.01em", marginBottom: 4 }}>{r.title}</p>
                <Body style={{ marginBottom: 5 }}>{r.body}</Body>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 4 }}>
                  <span style={{ fontSize: 7.5, fontWeight: 800, color: RED, flexShrink: 0, marginTop: 1 }}>COST IF UNADDRESSED</span>
                  <p style={{ fontSize: 8.5, color: MUTED }}>{r.cost}</p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                  <span style={{ fontSize: 7.5, fontWeight: 800, color: SUBTLE, flexShrink: 0 }}>EVIDENCE</span>
                  <p style={{ fontSize: 8.5, color: SUBTLE, fontStyle: "italic" }}>{r.ev}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Footer n={9} total={TOTAL} />
    </ContentPage>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 10 — OPERATOR'S LENS: SEVERITY MATRIX + EXECUTIVE SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════
function OperatorLens({ d }: { d: Analytics }) {
  const { brief1, brief2b, bonus } = d;
  const kycFraudTotal = brief2b.fraud_count * brief2b.fraud_avg_amount;
  const top5Total     = bonus.top_fraudsters.reduce((s: number, f) => s + f.amount, 0);
  const top1          = bonus.top_fraudsters[0];
  const avgTxnGbp     = top1 && top1.txns ? top1.amount / 100 / top1.txns : 0;
  const proj30dGbp    = top1 ? Math.round((top1.txns / 180) * 30 * avgTxnGbp) : 0;

  // 2×2 quadrant data  [ease: easy|hard, impact: high|low]
  const quadrants = [
    {
      ease: "easy", impact: "high",
      tag: "QUICK WIN · ACT TODAY",
      tagColor: INK,
      title: "REC 4 — Suspend Top Actors",
      detail: `Top 5 actors: ${fmtGbpFromMinor(top5Total)} at risk. Actor suspension: hours. Nightly composite scoring: days.`,
      border: INK,
      bg: "#fafafa",
    },
    {
      ease: "hard", impact: "high",
      tag: "STRATEGIC BET · 3–6 MONTHS",
      tagColor: RED,
      title: "REC 3 — Behavioural Rule Engine",
      detail: `${fmtM(Math.round(kycFraudTotal))} addressable. Requires rules pipeline + monitoring infra. Highest financial leverage.`,
      border: RED,
      bg: "#fff9f9",
    },
    {
      ease: "easy", impact: "low",
      tag: "HYGIENE · DAYS TO WEEKS",
      tagColor: MUTED,
      title: "REC 1 + 2 — Metric Fix & Geo Model",
      detail: `Reporting change (${brief1.revolut_rate}% replaces ${brief1.marketing_rate}%) + dashboard dual-axis. Eliminates structural blind spots.`,
      border: RULE,
      bg: "#ffffff",
    },
    {
      ease: "hard", impact: "low",
      tag: "— NOT APPLICABLE",
      tagColor: SUBTLE,
      title: "No recommendations in this quadrant",
      detail: "All four actions have clear, positive ROI. No low-impact, high-effort proposals are made.",
      border: RULE,
      bg: "#f8f8f8",
    },
  ];

  return (
    <ContentPage>
      <SecHead
        overline="Section 7 — Operator's Lens"
        title="Priority Matrix & Executive Summary"
        desc="Ease of implementation vs financial impact: what clears this week versus what needs executive sponsorship and a delivery roadmap."
        recommendation="Use the forward-looking exposure block with the matrix to sequence REC 1–4; brief leadership with the executive synthesis below — transaction-level monitoring after KYC is the structural complement to identity checks."
        methodology={
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            <strong>Operator context.</strong> The matrix is intentionally coarse — “easy” still means change management (REC 1 touches how the firm talks about growth). “Hard” reflects engineering and policy work for TM rules (REC 3). The synthesis at the bottom is the single narrative: monitoring fraud <em>in motion</em>, not only at onboarding.
          </p>
        }
      />

      {/* 2×2 Matrix — proper grid: [y-label col] [easy col] [hard col] */}
      <div style={{ display: "grid", gridTemplateColumns: "14px 1fr 1fr", gridTemplateRows: "auto 1fr 1fr", gap: 8, marginBottom: 14 }}>

        {/* ── Header row ── */}
        <div /> {/* corner */}
        {["EASY TO IMPLEMENT", "HARDER TO IMPLEMENT"].map(h => (
          <div key={h} style={{ textAlign: "center", paddingBottom: 4 }}>
            <p style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: SUBTLE }}>{h}</p>
          </div>
        ))}

        {/* ── Row 1: HIGH IMPACT ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gridRow: "2 / 3" }}>
          <p style={{ fontSize: 6.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: SUBTLE, writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap" }}>HIGH IMPACT</p>
        </div>
        {quadrants.filter(q => q.impact === "high").map(q => (
          <div key={q.title} style={{ border: `1.5px solid ${q.border}`, borderRadius: 6, padding: "12px 14px", background: q.bg, display: "flex", flexDirection: "column", gap: 5 }}>
            <p style={{ fontSize: 6.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: q.tagColor }}>{q.tag}</p>
            <p style={{ fontSize: 10, fontWeight: 800, color: INK, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{q.title}</p>
            <p style={{ fontSize: 8, color: MUTED, lineHeight: 1.55 }}>{q.detail}</p>
          </div>
        ))}

        {/* ── Row 2: LOW IMPACT ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gridRow: "3 / 4" }}>
          <p style={{ fontSize: 6.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: SUBTLE, writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap" }}>LOW IMPACT</p>
        </div>
        {quadrants.filter(q => q.impact === "low").map(q => (
          <div key={q.title} style={{ border: `1.5px solid ${q.border}`, borderRadius: 6, padding: "12px 14px", background: q.bg, display: "flex", flexDirection: "column", gap: 5 }}>
            <p style={{ fontSize: 6.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: q.tagColor }}>{q.tag}</p>
            <p style={{ fontSize: 10, fontWeight: 800, color: INK, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{q.title}</p>
            <p style={{ fontSize: 8, color: MUTED, lineHeight: 1.55 }}>{q.detail}</p>
          </div>
        ))}
      </div>

      {/* Forward-looking callout */}
      <div style={{ padding: "10px 14px", border: `1px solid ${RULE}`, borderLeft: `3px solid ${RED}`, marginBottom: 14 }}>
        <p style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: RED, marginBottom: 5 }}>Forward-Looking Exposure Model</p>
        <Body>
          At <strong style={{ color: INK }}>{top1?.full_id.slice(0,8)}</strong>&apos;s run rate of {fmt(top1?.txns ?? 0)} transactions generating {fmtGbpFromMinor(top1?.amount ?? 0)}, and assuming a 6-month observation window (approximately {top1 ? (top1.txns/180).toFixed(1) : 0} transactions per day at {fmtGbpFromMinor(Math.round(avgTxnGbp * 100))} average),{" "}
          <strong style={{ color: RED }}>30 additional days without intervention projects {fmtGbpFromMinor(Math.round(proj30dGbp * 100))} in further exposure.</strong>{" "}
          Risk compounds in real time: each detection cycle that passes without nightly scoring is a window where ranked actors continue operating unimpeded. The priority matrix above exists precisely to collapse that window.
        </Body>
      </div>

      {/* Executive summary */}
      <div style={{ paddingTop: 10, borderTop: `2px solid ${INK}` }}>
        <p style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: SUBTLE, marginBottom: 5 }}>Executive summary</p>
        <Body>
          <strong style={{ color: INK }}>Assessment.</strong> Controls are strongest at onboarding (KYC) and comparatively weaker on ongoing transaction behaviour.
          Conversion dynamics, geographic exposure in merchant channels, KYC-status exploitation, and sustained activity among top actors are consistent with a material gap in{" "}
          <strong style={{ color: INK }}>post-onboarding behavioural monitoring</strong>.
        </Body>
        <Body style={{ marginTop: 6 }}>
          <strong style={{ color: INK }}>Recommendation.</strong> Prioritise real-time, transaction-level anomaly detection layered on identity verification rather than disconnected point fixes.
          The priority matrix above sequences near-term execution (e.g. suspension per REC 4, rule-engine delivery per REC 3, reporting remediation per RECs 1–2); closing the monitoring gap addresses the shared driver across these dimensions.
        </Body>
      </div>

      <Footer n={10} total={TOTAL} />
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
        <OperatorLens    d={data} />
      </div>
    </div>
  );
}

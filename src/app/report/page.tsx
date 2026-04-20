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
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer,
} from "recharts";
import type { Analytics } from "@/lib/types";
import { readPersistedAnalytics } from "@/lib/persistedAnalytics";
import { ghostUsersVsMarketingClaim, notTrueConvertedUserCount } from "@/lib/brief1Metrics";
import { regionDisplayName } from "@/lib/regionDisplayName";
import { buildBrief2bMerchantMixRows } from "@/lib/brief2bMerchantChart";
import FraudstersAuditBlock from "@/components/FraudstersAuditBlock";
import GeographicRiskBubbleChart from "@/components/GeographicRiskBubbleChart";
import { fmtGbpFromAmount, fmtRawAmountMajor } from "@/lib/gbpMinor";

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

/** System stack prints more predictably to PDF than a single webfont (subset/rasterisation varies by browser). */
const REPORT_FONT =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif';

/** One scale for section intro, recommendations, findings, and other prose (bold lead-ins use same px, different weight). */
const REPORT_BODY_SIZE = 9.5;
const REPORT_BODY_LH = 1.58;

/** Section titles (h2): book weight — heavy 700+ reads “blobby” in PDF rasterisation. */
const REPORT_SECTION_TITLE_SIZE = 17;
const REPORT_SECTION_TITLE_WEIGHT = 600;

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
          <ChartTooltipRow variant="report" label="Fraud loss" value={fmtRawAmountMajor(d.fraud_amount)} valueColor={RED} />
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
  <p
    style={{
      fontFamily: REPORT_FONT,
      fontSize: 7.5,
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: SUBTLE,
      marginBottom: 6,
    }}
  >
    {children}
  </p>
);

const Body = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <p
    style={{
      fontFamily: REPORT_FONT,
      fontSize: REPORT_BODY_SIZE,
      color: MUTED,
      lineHeight: REPORT_BODY_LH,
      fontWeight: 400,
      ...style,
    }}
  >
    {children}
  </p>
);

// KPI: no card — just a number with a top rule
function Kpi({ label, value, sub, red, valueSize }: { label: string; value: string; sub?: string; red?: boolean; valueSize?: number }) {
  return (
    <div style={{ borderTop: `1.5px solid ${red ? RED : RULE}`, paddingTop: 8, fontFamily: REPORT_FONT }}>
      <p style={{ fontSize: 7, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: SUBTLE, marginBottom: 5 }}>{label}</p>
      <p style={{ fontSize: valueSize ?? 26, fontWeight: 700, letterSpacing: "-0.03em", color: red ? RED : INK, lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ fontSize: 8, color: SUBTLE, marginTop: 4, lineHeight: 1.45 }}>{sub}</p>}
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
  /** Tighter vertical rhythm for dense print pages (e.g. geographic risk). */
  compact,
}: {
  overline: string;
  title: string;
  desc?: string;
  methodology?: ReactNode;
  recommendation?: string;
  compact?: boolean;
}) {
  return (
    <div style={{ marginBottom: compact ? 10 : 16, paddingBottom: compact ? 8 : 12, borderBottom: `1px solid ${RULE}` }}>
      <OL>{overline}</OL>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: desc || recommendation ? 8 : 0 }}>
        <h2
          style={{
            flex: "1 1 auto",
            fontFamily: REPORT_FONT,
            fontSize: REPORT_SECTION_TITLE_SIZE,
            fontWeight: REPORT_SECTION_TITLE_WEIGHT,
            letterSpacing: "-0.012em",
            color: INK,
            lineHeight: 1.25,
            margin: 0,
          }}
        >
          {title}
        </h2>
        {methodology ? (
          <MethodHint label="Method" trigger="text">
            {methodology}
          </MethodHint>
        ) : null}
      </div>
      {desc && <Body style={{ maxWidth: 600 }}>{desc}</Body>}
      {recommendation && (
        <Body style={{ maxWidth: 600, marginTop: compact ? 6 : 8, color: INK }}>
          <strong style={{ fontWeight: 600 }}>Recommendation.</strong> {recommendation}
        </Body>
      )}
    </div>
  );
}

// Chart label
const ChartLabel = ({ children }: { children: React.ReactNode }) => (
  <p
    style={{
      fontFamily: REPORT_FONT,
      fontSize: 7.5,
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: SUBTLE,
      marginBottom: 8,
    }}
  >
    {children}
  </p>
);

// ── page shells ───────────────────────────────────────────────────────────────
function Page({ children, bg }: { children: React.ReactNode; bg?: string }) {
  return (
    <div
      className="report-page"
      style={{
        width: "210mm",
        height: "297mm",
        overflow: "hidden",
        background: bg ?? WHITE,
        position: "relative",
        boxSizing: "border-box",
        fontFamily: REPORT_FONT,
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
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
      <p style={{ fontFamily: REPORT_FONT, fontSize: 7.5, color: SUBTLE, margin: 0, lineHeight: 1.35 }}>Revolut Financial Crime Intelligence · Confidential</p>
      <p style={{ fontFamily: REPORT_FONT, fontSize: 7.5, color: SUBTLE, margin: 0, lineHeight: 1.35 }}>{n} / {total}</p>
    </div>
  );
}

const TOTAL = 11;

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
        <h1 style={{ fontSize: 50, fontWeight: 700, letterSpacing: "-0.03em", color: WHITE, lineHeight: 1.05, marginBottom: 18 }}>
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
        <p style={{ fontSize: 7.5, color: SUBTLE, lineHeight: 1.55, marginBottom: 14, maxWidth: 560 }}>
          <strong style={{ color: MUTED }}>Currency.</strong>{" "}
          <code>AMOUNT</code> is mixed-currency. <strong>Raw sums</strong> sum numeric <code>AMOUNT</code> as in the file (naive mix).{" "}
          <strong>Fiat GBP (ex crypto)</strong> converts each non-crypto row to GBP using embedded FX (open.er-api, GBP base, rates as of {overview.fx_rates_as_of_utc ?? "see snapshot"}); BTC/ETH/LTC/XRP rows are excluded from those totals.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 0", marginBottom: 32 }}>
          {[
            { l: "Transactions Analysed", v: fmt(overview.total_txns),     sub: "across all transaction types" },
            { l: "Unique Users",           v: fmt(overview.unique_users),   sub: "registered accounts" },
            { l: "Total Volume (raw)",     v: fmtRawAmountMajor(overview.total_amount),  sub: "naive sum of AMOUNT (mixed units)" },
            { l: "Total Volume (fiat GBP)", v: typeof overview.total_amount_gbp_fiat === "number" ? fmtM(overview.total_amount_gbp_fiat) : "—", sub: "fiat only, FX-converted; crypto excluded" },
            { l: "Fraud Events",           v: fmt(overview.total_fraud),    sub: `${overview.fraud_rate}% fraud rate` },
            { l: "Unique Fraud Actors",    v: fmt(d.bonus.total_fraudsters), sub: "composite-scored actors" },
            { l: "Fraud Losses (raw)",     v: fmtRawAmountMajor(overview.fraud_amount),  sub: `${overview.fraud_amount_pct}% of raw total volume` },
            { l: "Fraud Losses (fiat GBP)", v: typeof overview.fraud_amount_gbp_fiat === "number" ? fmtM(overview.fraud_amount_gbp_fiat) : "—", sub: typeof overview.fraud_amount_pct_gbp_fiat === "number" ? `${overview.fraud_amount_pct_gbp_fiat}% of fiat GBP volume` : "ex crypto" },
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

  const ghostMkt = ghostUsersVsMarketingClaim(brief1);
  const geoUC = d.brief2a.geo_risk_user_country ?? [];
  const hvU = geoUC[0];
  const hrU = [...geoUC].sort((a, b) => b.rate - a.rate)[0];

  const gbpFraud = overview.fraud_amount_gbp_fiat;
  const fraudLossGbp = typeof gbpFraud === "number";
  const fraudLossValue = fraudLossGbp ? fmtM(gbpFraud) : fmtRawAmountMajor(overview.fraud_amount);
  const fraudLossSub = fraudLossGbp && typeof overview.fraud_amount_pct_gbp_fiat === "number"
    ? `${overview.fraud_amount_pct_gbp_fiat}% of fiat GBP volume (ex crypto)`
    : `${overview.fraud_amount_pct}% of volume — raw mixed-currency sum`;

  const geoVolLabel = hvCountry === "—" ? "—" : `${regionDisplayName(hvCountry)} (${hvCountry})`;
  const geoRateLabel = hrCountry === "—" ? "—" : `${regionDisplayName(hrCountry)} (${hrCountry})`;
  const geoUserVol = hvU?.country ? `${regionDisplayName(hvU.country)} (${hvU.country})` : "—";
  const geoUserRate = hrU?.country ? `${regionDisplayName(hrU.country)} (${hrU.country})` : "—";

  const findings = [
    { n:"1", h:`Conversion gap of ${gap}pp`, b:`Marketing headline (${brief1.marketing_rate}%) uses users with ≥1 card or bank-transfer row ÷ all registered users (${fmt(brief1.card_or_bank_users)} ÷ ${fmt(brief1.unique_users)} — Brief 1 funnel definition). Versus true conversion (KYC-passed + ≥1 legitimate card) at ${brief1.revolut_rate}%, ${fmt(ghostMkt)} users remain who are implied by that headline if read as share of registered users but generate no interchange — not the ${fmt(notTrueConvertedUserCount(brief1))} “never converted” gap to 100% registration.` },
    { n:"2", h:"Geographic risk is two-dimensional", b:`Merchant country (${geoVolLabel} volume / ${geoRateLabel} rate — terminal “where”): ${fmtRawAmountMajor(hvAmt)} in ${geoVolLabel} fraud loss. User registered country (${geoUserVol} volume, ${geoUserRate} highest rate ${hrU?.rate ?? "—"}%) — customer/jurisdiction “who”. A single axis hides one threat. Globally, fraud losses split as merchant-facing (card + ATM): ${fmtRawAmountMajor(mfLoss)} — geographic controls apply — vs platform (top-up + P2P + bank transfer): ${fmtRawAmountMajor(pfLoss)} — velocity and behavioural controls apply.` },
    { n:"3", h:"KYC clearance ≠ legitimacy", b:`${fmt(d.brief2b.fraud_count)} fraud transactions came from KYC-passed users, over-indexing on ATM (+${atmDiff.toFixed(1)}pp) and bank transfers (+${bankDiff.toFixed(1)}pp).` },
    { n:"4", h:`One actor: ${fmtGbpFromAmount(top1?.amount ?? 0)} across ${top1?.countries_hit ?? 0} countries`, b:`${top1?.full_id.slice(0,8) ?? "—"} executed ${fmt(top1?.txns ?? 0)} transactions across all ${top1?.types_used ?? 0} channels. Risk score ${(top1?.score ?? 0).toFixed(1)} — ${scoreRatio}× the second-ranked actor.` },
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
              The KPI strip below summarises the whole book. Fraud loss uses <strong>fiat GBP</strong> (FX-converted, crypto excluded) when available — comparable across currencies. Figure 1 shows where fraud concentrates by <em>volume</em> (raw transaction counts), not by rate — high bars are not automatically the highest-risk channels.
            </p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <strong>Marketing vs true conversion.</strong> The marketing share and conversion gap use the same funnel definition as Brief&nbsp;1:{" "}
              <code>card_or_bank_users</code> ÷ <code>unique_users</code> ({fmt(brief1.card_or_bank_users)} ÷ {fmt(brief1.unique_users)}). The headline <strong>marketing reach</strong> KPI in this pack is <strong>{brief1.marketing_rate}%</strong>. Any external prose that rounds that headline to a whole percent (for example ~78%) must recompute the gap from the rounded pair.
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
        <Kpi
          label={fraudLossGbp ? "Fraud Losses (fiat GBP)" : "Fraud Losses"}
          value={fraudLossValue}
          sub={fraudLossSub}
          red
        />
        <div style={{ marginTop: 14 }}><Kpi label="Unique Users"     value={fmt(overview.unique_users)} sub="registered accounts" /></div>
        <div style={{ marginTop: 14 }}><Kpi label="True Conversion"  value={`${brief1.revolut_rate}%`} sub={`vs ${brief1.marketing_rate}% marketing reach (${fmt(brief1.card_or_bank_users)}÷${fmt(brief1.unique_users)} users per Brief 1)`} /></div>
        <div style={{ marginTop: 14 }}><Kpi label="Conversion Gap"   value={`−${gap}pp`} sub="marketing − true; definitions aligned to Brief 1" red /></div>
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

      {/* Findings — same body size for index, bold lead-in, and paragraph (weight only differentiates). */}
      <ChartLabel>Key Findings</ChartLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {findings.map((f) => (
          <div
            key={f.n}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              paddingTop: 8,
              paddingBottom: 8,
              borderBottom: `1px solid ${RULE}`,
              fontFamily: REPORT_FONT,
              fontSize: REPORT_BODY_SIZE,
              lineHeight: REPORT_BODY_LH,
              color: MUTED,
            }}
          >
            <span
              style={{
                fontSize: REPORT_BODY_SIZE,
                fontWeight: 600,
                color: SUBTLE,
                minWidth: 14,
                lineHeight: REPORT_BODY_LH,
                paddingTop: 0,
              }}
            >
              {f.n}
            </span>
            <p style={{ margin: 0, flex: 1, minWidth: 0 }}>
              <strong style={{ fontWeight: 600, color: INK }}>{f.h}</strong> {f.b}
            </p>
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
  const { brief1 } = d;
  const gap      = (brief1.marketing_rate - brief1.revolut_rate).toFixed(1);
  const ghostMkt = fmt(ghostUsersVsMarketingClaim(brief1));
  const total    = brief1.unique_users || 1;

  /** Same five rows and order as `ConversionPage` “User funnel” (Brief 1 dashboard). Each % = share of all registered users. */
  const funnel: { l: string; v: number; p: number }[] = [
    { l: "Registered Users", v: brief1.unique_users, p: 100 },
    { l: "Topped Up", v: brief1.topup_users, p: Math.round((brief1.topup_users / total) * 100) },
    { l: "KYC Passed", v: brief1.kyc_passed_users, p: Math.round((brief1.kyc_passed_users / total) * 100) },
    { l: "Legitimate Card Payment", v: brief1.legit_card_users, p: Math.round((brief1.legit_card_users / total) * 100) },
    { l: "Revolut Converted (true)", v: brief1.revolut_converted_users, p: Math.round((brief1.revolut_converted_users / total) * 100) },
  ];

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
              <strong>Marketing headline ({brief1.marketing_rate}%).</strong>{" "}
              Numerator = distinct users with ≥1 <code>CARD_PAYMENT</code> or <code>BANK_TRANSFER</code> row (includes fraud). Denominator = all registered users ({fmt(brief1.unique_users)}). From those definitions the headline <strong>marketing reach</strong> KPI is <strong>{brief1.marketing_rate}%</strong> — user counts remain reconstructible from the extract.
            </p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <strong>Revolut (correct for interchange).</strong> KYC-passed + ≥1 <em>legitimate</em> card payment — the only transaction type mapping to interchange revenue and a revenue-positive primary account.
            </p>
            <p style={{ fontWeight: 700, color: INK, marginBottom: 6 }}>Figure 2</p>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              <strong>Figure 2</strong> uses the same five-step <strong>User funnel</strong> as the Brief&nbsp;1 dashboard: Registered → Topped up → KYC passed → Legitimate card payment → Revolut converted (true). Each bar = distinct users meeting that criterion ÷ all registered users ({fmt(total)}). Bars narrow toward true conversion; the headline <strong>marketing reach</strong> ({brief1.marketing_rate}%) is a separate definition and appears in the KPI cards above, not in this strip. Platform-wide fraud <em>rates</em> by channel are in Brief&nbsp;2B (Section&nbsp;4).
            </p>
          </>
        }
      />

      {/* Headline comparison — two equal cards, muted vs primary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{
          border: `1px solid ${RULE}`,
          borderRadius: 4,
          padding: "12px 14px",
          background: "#fafafa",
        }}>
          <p style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: SUBTLE, marginBottom: 8 }}>Marketing · overstated</p>
          <p style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-0.04em", color: MUTED, lineHeight: 1, margin: 0 }}>{brief1.marketing_rate}%</p>
          <p style={{ fontSize: 8, color: SUBTLE, marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>
            Card or bank-transfer activity ÷ registered users — includes fraud-labelled rows.
          </p>
        </div>
        <div style={{
          border: `1.5px solid ${INK}`,
          borderRadius: 4,
          padding: "12px 14px",
          background: WHITE,
        }}>
          <p style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: INK, marginBottom: 8 }}>True conversion · interchange</p>
          <p style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-0.04em", color: INK, lineHeight: 1, margin: 0 }}>{brief1.revolut_rate}%</p>
          <p style={{ fontSize: 8, color: MUTED, marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>
            KYC-passed + ≥1 legitimate card — revenue-ready users.
          </p>
        </div>
      </div>

      {/* User funnel — same five rows as dashboard Brief 1 */}
      <div style={{ width: "100%", boxSizing: "border-box", marginBottom: 14 }}>
        <ChartLabel>Figure 2 — User funnel (dashboard-aligned)</ChartLabel>
        <Body style={{ color: SUBTLE, marginTop: -2, marginBottom: 8 }}>
          Same row order and counts as the <strong style={{ color: MUTED }}>User funnel</strong> panel on the Brief&nbsp;1 page. Each value = distinct users in the extract; each % = that count ÷ all {fmt(total)} registered users.
        </Body>
        <div style={{ border: `1px solid ${RULE}`, borderRadius: 4, overflow: "hidden", boxSizing: "border-box", width: "100%" }}>
          {funnel.map((s, i) => {
            const isLast = i === funnel.length - 1;
            return (
              <div
                key={s.l}
                style={{
                  borderBottom: i < funnel.length - 1 ? `1px solid ${RULE}` : "none",
                  background: isLast ? "#f7f7f7" : WHITE,
                }}
              >
                <div style={{ padding: "10px 14px 8px", boxSizing: "border-box" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
                    <span style={{ fontSize: 8.5, fontWeight: isLast ? 700 : 600, color: INK, lineHeight: 1.35, flex: "1 1 auto", minWidth: 0 }}>{s.l}</span>
                    <div style={{ textAlign: "right", flexShrink: 0, minWidth: "fit-content" }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: INK, letterSpacing: "-0.02em", display: "block" }}>{fmt(s.v)}</span>
                      <span style={{ fontSize: 7.5, color: MUTED, display: "block", marginTop: 2 }}>{s.p}% of registered users</span>
                    </div>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "#ececec", overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, s.p)}%`, height: "100%", background: isLast ? INK : "#3d3d3d", borderRadius: 3 }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ fontFamily: REPORT_FONT, fontSize: 7.5, color: SUBTLE, marginTop: 8, marginBottom: 0, lineHeight: 1.55 }}>
          Marketing reach ({brief1.marketing_rate}%) uses card-or-bank-transfer users ÷ registered — see KPI cards and Method; it is intentionally <strong style={{ color: MUTED, fontWeight: 600 }}>not</strong> shown as a row here so this strip matches the dashboard funnel only.
        </p>
      </div>

      <div style={{
        padding: "12px 14px",
        borderTop: `1px solid ${RULE}`,
        borderRight: `1px solid ${RULE}`,
        borderBottom: `1px solid ${RULE}`,
        borderLeft: `3px solid ${INK}`,
        borderRadius: 4,
        background: "#fafafa",
        boxSizing: "border-box",
        width: "100%",
      }}>
        <p style={{ fontSize: 9, color: MUTED, margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: INK }}>Gap {gap}pp.</strong> If the {brief1.marketing_rate}% headline is read as share of registered users, it implies {fmt(brief1.marketing_implied_users ?? Math.ceil((brief1.unique_users * brief1.marketing_rate) / 100))} converting users vs {fmt(brief1.revolut_converted_users)} true ({ghostMkt} apparent “extras” with no interchange). Users never reaching true conversion vs full registration: {fmt(notTrueConvertedUserCount(brief1))}.
        </p>
      </div>

      <Footer n={4} total={TOTAL} />
    </ContentPage>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGES 5–6 — GEOGRAPHIC RISK (bubble + KPIs | bars + table + insight)
// ═══════════════════════════════════════════════════════════════════════════════
// Compact label for chart axes — keeps all ticks the same width
const shortLabel = (c: string) => c === "Unknown / Null" ? "N/A" : c;

function GeographicRisk({ d }: { d: Analytics }) {
  const geo    = d.brief2a.geo_risk;
  const top8   = geo.slice(0, 8);
  const byRate = [...geo].sort((a,b)=>b.rate-a.rate).slice(0, 8);
  const hv = geo[0], hr = byRate[0];
  const geoUser = d.brief2a.geo_risk_user_country ?? [];
  const hvU = geoUser[0];
  const hrU = [...geoUser].sort((a, b) => b.rate - a.rate)[0];
  const fraudSumMerchantGeo = geo.reduce((s, g) => s + g.fraud, 0);
  const hvShareMc = fraudSumMerchantGeo ? Math.round((hv.fraud / fraudSumMerchantGeo) * 100) : 0;
  const mfLoss = d.brief2a.fraud_amount_merchant_facing ?? 0;
  const pfLoss = d.brief2a.fraud_amount_platform ?? 0;
  const otherLoss = d.brief2a.fraud_amount_other_channels ?? 0;
  const btPlat = d.fraud_by_type.find((t) => t.type === "BANK_TRANSFER");

  // Map to short labels for chart axes only
  const top8Chart   = top8.map(r   => ({ ...r, country: shortLabel(r.country) }));
  const byRateChart = byRate.map(r => ({ ...r, country: shortLabel(r.country) }));

  const geoKpiRows: {
    label: string;
    value: string;
    sub: string;
    red?: boolean;
    smallValue?: boolean;
  }[][] = [
    [
      { label: "Merchant · Vol.", value: regionDisplayName(hv.country), sub: `${hv.country} · ${fmt(hv.fraud)} fraud txns`, smallValue: true },
      { label: "Merchant · Loss", value: fmtRawAmountMajor(hv.fraud_amount), sub: `${hv.rate}% rate`, red: true },
      { label: "Merchant · Top rate", value: regionDisplayName(hr.country), sub: `${hr.country} · ${hr.rate}% of txns`, red: true, smallValue: true },
      { label: "Merchant · 1 in", value: `${Math.round(100 / (hr.rate || 1))}`, sub: "txns fraudulent", red: true },
    ],
    [
      { label: "User COUNTRY · Vol.", value: hvU?.country ? regionDisplayName(hvU.country) : "—", sub: hvU?.country ? `${hvU.country} · ${fmt(hvU.fraud)} fraud txns` : "—", smallValue: true },
      { label: "User · Loss (top vol.)", value: hvU ? fmtRawAmountMajor(hvU.fraud_amount) : "—", sub: `${hvU?.rate ?? "—"}% rate`, red: true },
      { label: "User · Top rate", value: hrU?.country ? regionDisplayName(hrU.country) : "—", sub: hrU?.country ? `${hrU.country} · ${hrU?.rate ?? "—"}%` : "—", red: true, smallValue: true },
      { label: "User · 1 in", value: hrU ? `${Math.round(100 / (hrU.rate || 1))}` : "—", sub: "txns fraudulent", red: true },
    ],
  ];

  return (
    <>
    <ContentPage>
      <SecHead
        compact
        overline="Section 3 — Brief 2A"
        title="Geographic Risk Exposure"
        desc="Fraud risk has two dimensions: attack count (volume) and attack probability (rate). Conflating them leads to under-investment in high-rate markets."
        recommendation="Keep two live country views—fraud count vs fraud rate—with separate owners and escalation paths. Route merchant-facing cuts (card + ATM) to acquiring and card risk; route platform loss to TM rule tuning with Brief 2B. Review the ≥50-transactions-per-country floor at least quarterly as volumes grow."
        methodology={
          <>
            <p style={{ fontWeight: 700, color: INK, marginBottom: 6 }}>Data & lens</p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <strong>Merchant / terminal view.</strong> Charts and tables use non-blank <code>MERCHANT_COUNTRY</code> — attack <em>destination</em> (where the merchant or terminal sits). Rows with no merchant country (e.g. top-ups, P2P, bank transfers) are excluded from this slice and roll into the platform bucket below, not shown as a pseudo-country.
            </p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <strong>User jurisdiction view.</strong> <code>COUNTRY</code> is the user&apos;s registered country (same ≥50-txn floor) — origin / residency for policy and licensing. Expect different leaders: merchant view optimises terminal controls; user view optimises onboarding and corridor rules.
            </p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              Countries with fewer than fifty transactions are excluded so small-sample noise does not drive policy.
            </p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <strong>Prose and KPI tiles</strong> use full English region names (via <code>Intl.DisplayNames</code>) with the raw extract code in the subtitle so charts (which stay compact) remain reconcilable.
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

      {/* KPIs — single panel: merchant row + user row (saves vertical space vs eight standalone Kpi tiles) */}
      <div style={{ border: `1px solid ${RULE}`, borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
        <p style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: SUBTLE, margin: 0, padding: "6px 10px", background: "#fafafa", borderBottom: `1px solid ${RULE}` }}>
          Key metrics · merchant terminal vs user registered country
        </p>
        {geoKpiRows.map((row, ri) => (
          <div
            key={ri === 0 ? "mc" : "uc"}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              borderBottom: ri === 0 ? `1px solid ${RULE}` : "none",
            }}
          >
            {row.map((cell, ci) => (
              <div
                key={cell.label}
                style={{
                  padding: "7px 10px 8px",
                  borderRight: ci < 3 ? `1px solid ${RULE}` : "none",
                  minWidth: 0,
                }}
              >
                <p style={{ fontSize: 6.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: SUBTLE, margin: "0 0 4px" }}>{cell.label}</p>
                <p
                  style={{
                    fontSize: cell.smallValue ? 12 : 14,
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: cell.red ? RED : INK,
                    lineHeight: 1.15,
                    margin: 0,
                    wordBreak: "break-word",
                  }}
                >
                  {cell.value}
                </p>
                <p style={{ fontSize: 7, color: MUTED, margin: "3px 0 0", lineHeight: 1.35 }}>{cell.sub}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Loss split — side by side; bubble uses full page width below for PDF legibility */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div style={{ border: `1px solid ${INK}`, borderRadius: 6, padding: "10px 12px", background: "#fafafa" }}>
          <OL>Merchant-facing · CARD + ATM</OL>
          <p style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.03em", color: INK, lineHeight: 1.08, margin: "4px 0 0" }}>{fmtRawAmountMajor(mfLoss)}</p>
        </div>
        <div style={{ border: `1px solid ${RED}`, borderRadius: 6, padding: "10px 12px", background: "#fffafa" }}>
          <OL>Platform · TOPUP + P2P + BT</OL>
          <p style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.03em", color: RED, lineHeight: 1.08, margin: "4px 0 0" }}>{fmtRawAmountMajor(pfLoss)}</p>
        </div>
      </div>

      <div style={{ border: `1px solid ${RULE}`, borderRadius: 6, padding: "8px 10px 10px", marginBottom: 8 }}>
        <ChartLabel>Volume vs rate (≥50 txns / country)</ChartLabel>
        <div style={{ width: "100%", height: 256 }}>
          <GeographicRiskBubbleChart
            geo={geo}
            minN={50}
            height={256}
            compact
            showMethodHint={false}
            tooltipVariant="report"
            showHeading={false}
            showPostChartNotes={false}
            variant="report-panel"
          />
        </div>
      </div>
      {otherLoss > 0 && (
        <p style={{ fontFamily: REPORT_FONT, fontSize: 7.5, color: SUBTLE, marginTop: 0, marginBottom: 0, lineHeight: 1.5 }}>
          Other channel fraud (outside the five canonical types): {fmtRawAmountMajor(otherLoss)}.
        </p>
      )}

      <Footer n={5} total={TOTAL} />
    </ContentPage>

    <ContentPage>
      <div style={{ marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${RULE}` }}>
        <OL>Section 3 — Brief 2A</OL>
        <p
          style={{
            fontFamily: REPORT_FONT,
            fontSize: REPORT_SECTION_TITLE_SIZE,
            fontWeight: REPORT_SECTION_TITLE_WEIGHT,
            color: INK,
            letterSpacing: "-0.012em",
            lineHeight: 1.25,
            marginTop: 4,
            marginBottom: 0,
          }}
        >
          Geographic risk{" "}
          <span style={{ fontWeight: 500, color: SUBTLE }}>(continued)</span>
        </p>
        <Body style={{ marginTop: 6, marginBottom: 0, color: SUBTLE }}>
          Rankings and table below; volume–rate scatter is on the previous page. Figure 3 uses a square-root horizontal scale so smaller countries stay visible next to the volume leader.
        </Body>
      </div>

      {/* Dual bar charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 10 }}>
        <div>
          <ChartLabel>Figure 3 — Top 8 by Fraud Volume</ChartLabel>
          <p style={{ fontFamily: REPORT_FONT, fontSize: 7.5, color: SUBTLE, marginTop: -2, marginBottom: 6, lineHeight: 1.45 }}>
            Horizontal axis: square-root scale of fraud txn count (linear axis compresses non-leaders when one country dominates).
          </p>
          <ResponsiveContainer width="100%" height={198}>
            <BarChart data={top8Chart} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
              <XAxis
                type="number"
                dataKey="fraud"
                scale="sqrt"
                domain={[0, "dataMax"]}
                tick={{ fill: SUBTLE, fontSize: 8, fontFamily: "inherit" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <YAxis type="category" dataKey="country" interval={0} tick={{ fill: MUTED, fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<ReportGeoTip />} cursor={{ fill: "#f8f8f8" }} />
              <Bar dataKey="fraud" radius={[0, 3, 3, 0]} maxBarSize={22}>
                {top8.map((e, i) => <Cell key={e.country} fill={`rgba(15,15,15,${1 - i * 0.09})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <ChartLabel>Figure 4 — Top 8 by Fraud Rate (%)</ChartLabel>
          <ResponsiveContainer width="100%" height={198}>
            <BarChart data={byRateChart} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: SUBTLE, fontSize: 8, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="country" interval={0} tick={{ fill: MUTED, fontSize: 9, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<ReportGeoTip />} cursor={{ fill: "#f8f8f8" }} />
              <Bar dataKey="rate" radius={[0, 3, 3, 0]} maxBarSize={22}>
                {byRate.map((e, i) => <Cell key={e.country} fill={`rgba(204,19,32,${1 - i * 0.09})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Country table */}
      <table style={{ width: "100%", fontSize: 8.25, borderCollapse: "collapse", marginBottom: 8 }}>
        <thead>
          <tr style={{ borderBottom: `1.5px solid ${INK}` }}>
            {["Country", "Total Txns", "Fraud Txns", "Rate", "Fraud Loss"].map((h, hi) => (
              <th key={h} style={{ padding: "3px 6px", textAlign: hi === 0 ? "left" : "right", fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: SUBTLE }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {top8.map((row) => (
            <tr key={row.country} style={{ borderBottom: `1px solid ${RULE}` }}>
              <td style={{ padding: "4px 6px", fontWeight: 600, color: INK }}>{regionDisplayName(row.country)} <span style={{ fontWeight: 600, color: SUBTLE }}>({row.country})</span></td>
              <td style={{ padding: "4px 6px", color: MUTED, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(row.total)}</td>
              <td style={{ padding: "4px 6px", color: MUTED, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(row.fraud)}</td>
              <td style={{ padding: "4px 6px", textAlign: "right" }}>
                <span style={{ fontSize: 7.5, fontWeight: 700, color: row.rate > 4 ? RED : row.rate > 1 ? AMBER : SUBTLE, fontVariantNumeric: "tabular-nums" }}>
                  {row.rate}%
                </span>
              </td>
              <td style={{ padding: "4px 6px", color: MUTED, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtRawAmountMajor(row.fraud_amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Insight>
        <span style={{ fontSize: REPORT_BODY_SIZE, lineHeight: REPORT_BODY_LH, display: "block" }}>
          <strong style={{ color: INK }}>{hv.country} vs {byRate[0]?.country} (merchant) requires a dual-axis model.</strong>{" "}
          Among rows with a recorded merchant country, {hv.country} accounts for <strong style={{ color: INK }}>{hvShareMc}%</strong> of fraud transactions ({fmtRawAmountMajor(hv.fraud_amount)} lost) — operational load.{" "}
          {byRate[0]?.country}&apos;s {byRate[0]?.rate}% rate signals a concentrated vector at the terminal.{" "}
          <strong style={{ color: INK }}>Registered country:</strong> {hvU?.country} leads fraud count ({fmt(hvU?.fraud ?? 0)} txns); {hrU?.country} peaks on rate ({hrU?.rate}%) — use for onboarding and corridor policy.{" "}
          The merchant-facing vs platform split reconciles with Brief 2B: bank-transfer risk sits in the <strong style={{ color: INK }}>platform</strong> bucket ({fmtRawAmountMajor(pfLoss)}).
        </span>
      </Insight>

      <Footer n={6} total={TOTAL} />
    </ContentPage>
    </>
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
  const pendingTot = kyc_status.PENDING ?? 0;
  const pendingFraud = kyc_fraud_status.PENDING ?? 0;
  const failedTot = kyc_status.FAILED ?? 0;
  const failedFraud = kyc_fraud_status.FAILED ?? 0;
  const pendingFraudRate = pendingTot ? Math.round((pendingFraud / pendingTot) * 10000) / 100 : 0;
  const failedFraudRate = failedTot ? Math.round((failedFraud / failedTot) * 10000) / 100 : 0;
  const pOutId = brief2b.pending_fraud_outlier_user_id;
  const pOutFr = brief2b.pending_fraud_txns_from_outlier;
  const pOutShare = pOutId && pOutFr != null && pendingFraud > 0 ? ((pOutFr / pendingFraud) * 100).toFixed(0) : null;
  const pendEx = brief2b.pending_fraud_rate_ex_outlier;

  const fAtm = brief2b.fraud_type_pct["ATM"] ?? 0;
  const lAtm = brief2b.legit_type_pct["ATM"] ?? 0;
  const fTop = brief2b.fraud_type_pct["TOPUP"] ?? 0;
  const lTop = brief2b.legit_type_pct["TOPUP"] ?? 0;
  const fCard = brief2b.fraud_type_pct["CARD_PAYMENT"] ?? 0;
  const lCard = brief2b.legit_type_pct["CARD_PAYMENT"] ?? 0;
  const medAmtDiff = fraudMed - legitMed;
  const cohortPatternRows = [
    { label: "Median txn amount (fraud- vs legit-labelled txns)", f: fmtGbpFromAmount(fraudMed), l: fmtGbpFromAmount(legitMed), d: `${medAmtDiff >= 0 ? "+" : "−"}${fmtGbpFromAmount(Math.abs(medAmtDiff))}` },
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

  const radarPeak = Math.max(
    1,
    ...radarData.flatMap((r) => [Number(r.Fraud) || 0, Number(r.Legitimate) || 0]),
  );
  /** Tighter than [0,100] so fraud vs legit separation reads on the web (see Figure 5 caption). */
  const radarDomainMax = Math.min(100, Math.max(12, Math.ceil((radarPeak + 8) / 5) * 5));

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
        recommendation={`Stand up velocity on top-up followed by ATM or bank transfer, and tighten limits while KYC remains PENDING: fraud labelled on ${pendingFraudRate}% of PENDING transactions (${fmt(pendingFraud)} / ${fmt(pendingTot)}) vs ${failedFraudRate}% on FAILED (${fmt(failedFraud)} / ${fmt(failedTot)}).${pOutId && pOutFr != null ? ` Concentration: ${fmt(pOutFr)} of those fraud-labelled PENDING txns (${pOutShare}%) come from one user (${pOutId.slice(0, 8)}…); excluding that user the PENDING fraud rate drops to ~${pendEx ?? "—"}% — still elevated, but not solely driven by a single profile.` : ""} Pair channel mix rules with merchant-country anomalies from Table 2 and the Table 3 signals to catch “top-up and extract” paths.`}
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
              <strong>Table 2.</strong> “Merchant country” is <code>MERCHANT_COUNTRY</code> across all movements for users in each cohort (not only card spend).{" "}
              Null = non-merchant transaction types (TOPUP/P2P/BT) with no merchant country by design, not missing data.
            </p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <strong>Table 3.</strong> Same channel mix as Figure 5 as percentage-point distance from the legitimate KYC-passed baseline. “Anomalous” flags |gap| &gt; 2pp — a pragmatic screen for rule design, not a statistical test.
            </p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <strong>Table 2a / archetypes.</strong> Each KYC-passed fraud user is assigned one dominant rail from <strong>all</strong> their cohort transactions (not fraud rows only): three axis scores (top-up+ATM sum, bank transfer, card+½·P2P) as shares of total row count; winner unless best score &lt; 0.15 or best−second &lt; 0.04 on the 0–1 scale → <em>mixed</em>. Full wording: <code>brief2b.replication</code> in <code>analytics.json</code> (same as <code>brief2b-replication-meta.json</code>).
            </p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <strong>Row-order proxy.</strong> Each row inherits its 0-based index in the extract file. Tertiles split the file into early / mid / late thirds; median normalised index (0–1) summarises where fraud- vs legit-labelled cohort transactions sit <strong>if ingest order approximates vintage</strong>—hypothesis only.
            </p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <strong>REC 3 counterfactual (Section 6 cost line).</strong> User shares use the same all-cohort-txn row set as Table 2a; three strict tests (ATM share strictly above 25%, bank-transfer share strictly above 15%, card-payment share strictly below 45% — P2P excluded from the card fraction); flag when at least two are true. See <code>brief2b.replication.rec3_counterfactual</code> in <code>analytics.json</code>.
            </p>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              The next page opens with Table 3, then Figures 5–7 and the footprint interpretation, after Tables 1–2 (plus Table 2a where present).
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
      <p style={{ fontSize: 8, color: SUBTLE, marginTop: 0, marginBottom: 8, lineHeight: 1.45 }}>
        Null = non-merchant transaction types (TOPUP/P2P/BT) with no merchant country by design, not missing data.
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

      {brief2b.kyc_fraud_archetypes && brief2b.kyc_fraud_archetypes.length > 0 && (
        <>
          <p style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: SUBTLE, marginBottom: 4, marginTop: 14 }}>
            Table 2a — Actor archetypes (dominant rail, {fmt(brief2b.kyc_fraud_users)} KYC-passed fraud users)
          </p>
          <p style={{ fontSize: 8, color: SUBTLE, marginTop: 0, marginBottom: 8, lineHeight: 1.45 }}>
            Segmentation answers whether the fraud cohort is one blob or several rails strategies: each user gets the rail with the strongest share of <em>all</em> their cohort transactions (see methodology).
          </p>
          <table style={{ width: "100%", fontSize: 8.5, borderCollapse: "collapse", marginBottom: 10 }}>
            <thead>
              <tr style={{ borderBottom: `1.5px solid ${INK}` }}>
                {["Archetype", "Users", "% users", "Fraud txns", "% fraud txns"].map((h) => (
                  <th key={h} style={{ padding: "3px 8px", textAlign: "left", fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: SUBTLE }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {brief2b.kyc_fraud_archetypes.map((row) => (
                <tr key={row.id} style={{ borderBottom: `1px solid ${RULE}` }}>
                  <td style={{ padding: "5px 8px", fontWeight: 600, color: INK }}>{row.label}</td>
                  <td style={{ padding: "5px 8px", fontWeight: 700, color: RED }}>{fmt(row.users)}</td>
                  <td style={{ padding: "5px 8px", color: MUTED }}>{row.pct_users != null ? `${row.pct_users}%` : "—"}</td>
                  <td style={{ padding: "5px 8px", color: MUTED }}>{fmt(row.fraud_txns)}</td>
                  <td style={{ padding: "5px 8px", color: MUTED }}>{row.pct_fraud_txns != null ? `${row.pct_fraud_txns}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {brief2b.kyc_fraud_row_order_tertile_fraud_share_pct && brief2b.kyc_fraud_median_row_order_norm != null && brief2b.kyc_legit_median_row_order_norm != null && (
        <Body style={{ marginTop: 4, marginBottom: 4, color: MUTED }}>
          <strong style={{ color: INK }}>Row-order proxy (no dates).</strong>{" "}
          Cohort fraud-labelled transactions fall{" "}
          <strong style={{ color: INK }}>{brief2b.kyc_fraud_row_order_tertile_fraud_share_pct[0]}%</strong> /{" "}
          <strong style={{ color: INK }}>{brief2b.kyc_fraud_row_order_tertile_fraud_share_pct[1]}%</strong> /{" "}
          <strong style={{ color: INK }}>{brief2b.kyc_fraud_row_order_tertile_fraud_share_pct[2]}%</strong> in the early / middle / late thirds of the CSV file.
          Median normalised row index is <strong style={{ color: INK }}>{brief2b.kyc_fraud_median_row_order_norm}</strong> (fraud cohort, fraud-labelled rows) vs{" "}
          <strong style={{ color: INK }}>{brief2b.kyc_legit_median_row_order_norm}</strong> (legit cohort, legit-labelled rows)—
          {brief2b.kyc_fraud_median_row_order_norm < brief2b.kyc_legit_median_row_order_norm
            ? "fraud activity skews earlier in file order under this proxy."
            : brief2b.kyc_fraud_median_row_order_norm > brief2b.kyc_legit_median_row_order_norm
              ? "fraud activity skews later in file order under this proxy."
              : "no directional skew vs legit under this proxy."}
        </Body>
      )}

      <Footer n={7} total={TOTAL} />
    </ContentPage>

    <ContentPage>
      <div style={{ marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${RULE}` }}>
        <OL>Section 4 — Brief 2B</OL>
        <p
          style={{
            fontFamily: REPORT_FONT,
            fontSize: REPORT_BODY_SIZE,
            fontWeight: 600,
            color: INK,
            letterSpacing: "-0.01em",
            marginTop: 4,
            marginBottom: 0,
            lineHeight: REPORT_BODY_LH,
          }}
        >
          Channel signals & mix
        </p>
        <Body style={{ marginTop: 4, marginBottom: 0, color: SUBTLE }}>
          Tables 1–2 on the prior page. Table 3 lists percentage-point deviations from the legitimate baseline; Figures 5–6 show the same cohort mix and platform-wide fraud rates by channel.
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
          <ChartLabel>Figure 5 — Transaction Mix: Fraud vs Legitimate (%)</ChartLabel>
          <p style={{ fontSize: 8, color: SUBTLE, marginTop: -4, marginBottom: 6, lineHeight: 1.5 }}>
            Radial axis capped at {radarDomainMax}% (not 0–100) so the two cohort shapes use more of the plot area.
          </p>
          <ResponsiveContainer width="100%" height={142}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={RULE} />
              <PolarAngleAxis dataKey="type" tick={{ fill: MUTED, fontSize: 9, fontFamily: "inherit" }} />
              <PolarRadiusAxis
                angle={90}
                domain={[0, radarDomainMax]}
                tickCount={5}
                tick={{ fill: SUBTLE, fontSize: 7, fontFamily: "inherit" }}
                tickFormatter={(v) => `${v}%`}
                axisLine={false}
              />
              <Radar name="Fraud"      dataKey="Fraud"      stroke={RED}  fill={RED}  fillOpacity={0.1} />
              <Radar name="Legitimate" dataKey="Legitimate" stroke={INK}  fill={INK}  fillOpacity={0.05} />
              <Legend wrapperStyle={{ fontSize: 9, color: SUBTLE, paddingTop: 2 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <ChartLabel>Figure 6 — Fraud Rate by Channel (%)</ChartLabel>
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

      {brief2b.kyc_fraud_type_merchant_heatmap && (() => {
        const hm = brief2b.kyc_fraud_type_merchant_heatmap;
        const vmax = Math.max(1, ...hm.matrix.flat());
        const shortType = (t: string) =>
          t.replace("CARD_PAYMENT", "Card").replace("BANK_TRANSFER", "Transfer").replace("TOPUP", "Top-up").replace(/_/g, " ");
        return (
          <div style={{ marginBottom: 14 }}>
            <ChartLabel>Figure 7 — Fraud cohort: channel × merchant country (fraud-labelled txns)</ChartLabel>
            <p style={{ fontSize: 8, color: SUBTLE, marginBottom: 6, lineHeight: 1.45 }}>
              Top six channel types by fraud volume × top eight merchant countries. Cell = raw count; shading encodes density within the grid (not a rate).
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", fontSize: 7.5, width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ padding: 4, borderBottom: `1px solid ${INK}`, textAlign: "left", color: SUBTLE }}>Type</th>
                    {hm.col_labels.map((c) => (
                      <th key={c} style={{ padding: 4, borderBottom: `1px solid ${INK}`, textAlign: "center", fontWeight: 700, color: SUBTLE, maxWidth: 56 }}>
                        {c.length > 10 ? `${c.slice(0, 9)}…` : c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hm.row_labels.map((ty, ri) => (
                    <tr key={ty}>
                      <td style={{ padding: 4, fontWeight: 600, borderBottom: `1px solid ${RULE}`, color: INK }}>{shortType(ty)}</td>
                      {(hm.matrix[ri] ?? []).map((v, ci) => (
                        <td
                          key={`${ri}-${ci}`}
                          style={{
                            padding: 4,
                            textAlign: "center",
                            borderBottom: `1px solid ${RULE}`,
                            background: `rgba(207,19,34,${0.05 + (v / vmax) * 0.52})`,
                            color: v > vmax * 0.35 ? "#fff" : INK,
                            fontWeight: v > 0 ? 600 : 400,
                          }}
                        >
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      <Insight>
        {(() => {
          const atmD  = ((brief2b.fraud_type_pct["ATM"]          ?? 0) - (brief2b.legit_type_pct["ATM"]          ?? 0)).toFixed(1);
          const bankD = ((brief2b.fraud_type_pct["BANK_TRANSFER"] ?? 0) - (brief2b.legit_type_pct["BANK_TRANSFER"] ?? 0)).toFixed(1);
          const cardD = ((brief2b.fraud_type_pct["CARD_PAYMENT"]  ?? 0) - (brief2b.legit_type_pct["CARD_PAYMENT"]  ?? 0)).toFixed(1);
          const tert = brief2b.kyc_fraud_row_order_tertile_fraud_share_pct;
          const tertNote =
            tert && tert.length === 3
              ? (() => {
                  const labels = ["earliest", "middle", "latest"] as const;
                  const maxIdx = tert[0] >= tert[1] && tert[0] >= tert[2] ? 0 : tert[1] >= tert[2] ? 1 : 2;
                  return ` If CSV row order proxies tenure, the heaviest cohort-fraud concentration is the ${labels[maxIdx]} third of the file (${tert[maxIdx]}% of fraud-labelled txns; split ${tert[0]}% / ${tert[1]}% / ${tert[2]}% early / mid / late).`;
                })()
              : "";
          return (
            <>
              <strong style={{ color: INK }}>Fraudsters leave a detectable footprint.</strong>{" "}
              They over-index on ATM (+{atmD}pp) and bank transfers (+{bankD}pp) while under-indexing on card payments ({cardD}pp).{" "}
              Median birth year {fraudBirthMed} (fraud) vs {legitBirthMed} (legit). Merchant-country concentration differs materially between cohorts (Table 2).{tertNote}
            </>
          );
        })()}
      </Insight>

      <Footer n={8} total={TOTAL} />
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

  const amountGbp = top1 ? top1.amount : 0;
  const avgTxnGbp = top1 && top1.txns ? amountGbp / top1.txns : 0;
  const dailyRate   = top1 ? top1.txns / 180 : 0;
  const proj30dGbp  = top1 ? Math.round(dailyRate * 30 * avgTxnGbp) : 0;
  const proj30dSens = top1 ? Math.round(dailyRate * 2 * 30 * avgTxnGbp) : 0;

  return (
    <ContentPage>
      <SecHead
        overline="Section 5 — Bonus"
        title="Top Fraudster Prioritisation"
        desc={`Naive amount ranking answers “who lost the most today”; composite scoring across ${fmt(bonus.total_fraudsters)} actors answers “who will still be moving money tomorrow if left untouched”.`}
        recommendation="Run the composite nightly on the full fraud-user population and auto-queue the top decile for enhanced review. For the #1 actor, treat channel diversity plus cross-border use as a hard escalation — static limits rarely catch users who are already active on every rail."
        methodology={
          <>
            <p style={{ fontWeight: 700, color: INK, marginBottom: 6 }}>Composite score</p>
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              0.35·fraud value + 0.30·fraud txn count + 0.15·user fraud rate + 0.10·type diversity + 0.10·country diversity. Weights follow risk-team framing. Each dimension is scaled to [0, 1] <strong>via division by the dimension maximum (max-normalisation)</strong> across all {fmt(bonus.total_fraudsters)} fraud actors — not min–max, z-score, or rank. Displayed score is 0–100. Naive ranking is shown alongside for contrast. Dossier tables list <strong>raw Σ <code>AMOUNT</code></strong> (naive mixed-currency, same scale as cover raw fraud loss) and <strong>Fiat GBP</strong> (embedded FX per row, ex crypto). The composite fraud-value term uses raw Σ <code>AMOUNT</code> only.
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

      <Insight>
        <strong style={{ color: INK }}>Robustness check:</strong>{" "}
        FX-converting fraud values displaces 2 of 5 naïve Top-5 entries but leaves the composite Top-5 membership unchanged — the composite captures structural risk, not currency-mix noise.
      </Insight>

      {top1 && (
        <div style={{ marginTop: 10, padding: "8px 14px", borderLeft: `2px solid ${RED}`, background: "#fafafa" }}>
          <p style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: RED, marginBottom: 4 }}>30-Day Forward Projection</p>
          <Body>
            At <strong style={{ color: INK }}>{top1.full_id.slice(0,8)}</strong>&apos;s current run rate of {fmt(top1.txns)} transactions generating {fmtGbpFromAmount(top1.amount)}, and <strong>assuming the extract represents a 6-month window for illustration only</strong> (no calendar column — roughly {dailyRate.toFixed(1)} txns/day at {fmtGbpFromAmount(Math.round(avgTxnGbp))} average),{" "}
            <strong style={{ color: RED }}>30 further days without intervention projects ~{fmtGbpFromAmount(proj30dGbp)} exposure at that run rate.</strong>{" "}
            Sensitivity: if the same activity were compressed into <strong>3 months</strong>, daily throughput doubles and the same 30-day band scales to ~{fmtGbpFromAmount(proj30dSens)}. With all {top1.types_used} channels active across {top1.countries_hit} countries, velocity — not footprint expansion — is the main remaining detection window.
          </Body>
        </div>
      )}

      <Footer n={9} total={TOTAL} />
    </ContentPage>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 9 — RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════════
function Recommendations({ d }: { d: Analytics }) {
  const { brief1, overview, brief2b, bonus, kyc_status, kyc_fraud_status } = d;
  const gap = (brief1.marketing_rate - brief1.revolut_rate).toFixed(1);
  const ghostMkt = ghostUsersVsMarketingClaim(brief1);
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
  const kycFraudAmt   = brief2b.fraud_amount_kyc_passed_cohort ?? brief2b.fraud_count * brief2b.fraud_avg_amount;
  const kycFraudFiat  = brief2b.fraud_amount_kyc_passed_cohort_gbp_fiat;
  const kycFiatTxnN = brief2b.fraud_txns_kyc_passed_cohort_fiat_gbp;
  const kycMeanRec3 =
    typeof kycFraudFiat === "number" && typeof kycFiatTxnN === "number" && kycFiatTxnN > 0
      ? Math.round(kycFraudFiat / kycFiatTxnN)
      : typeof kycFraudFiat === "number" && brief2b.fraud_count > 0
        ? Math.round(kycFraudFiat / brief2b.fraud_count)
        : brief2b.fraud_avg_amount;
  const kycAvgK       = (kycMeanRec3 / 1000).toFixed(1);
  const kycFiatTxnLabel =
    typeof kycFraudFiat === "number" && typeof kycFiatTxnN === "number"
      ? fmt(kycFiatTxnN)
      : fmt(brief2b.fraud_count);
  const rec3CounterNote =
    typeof brief2b.rec3_rule_scope_fraud_txns_fiat_gbp === "number" &&
    typeof kycFiatTxnN === "number" &&
    kycFiatTxnN > 0 &&
    typeof brief2b.rec3_rule_flagged_users === "number"
      ? ` Static counterfactual (no calendar dates): shares use every cohort txn for that user (fraud- and legit-labelled rows); ATM/T strictly greater than 0.25, BANK_TRANSFER/T strictly greater than 0.15, CARD_PAYMENT/T strictly less than 0.45 (P2P excluded from the card fraction); user flagged when at least two of those three tests fire—${fmt(brief2b.rec3_rule_flagged_users)} users, ${fmt(brief2b.rec3_rule_scope_fraud_txns_fiat_gbp)} of ${fmt(kycFiatTxnN)} fiat-convertible cohort fraud txns in rule scope (see brief2b.replication in analytics.json). Not recovered £.`
      : "";
  const rec3CostLine =
    typeof kycFraudFiat === "number"
      ? `That cohort's fraud loss on fiat GBP (FX-converted, crypto excluded — the same basis as executive fraud losses) is ${fmtM(Math.round(kycFraudFiat))} (~£${kycAvgK}K mean × ${kycFiatTxnLabel} fraud-labelled txns with a fiat GBP conversion). Addressable with post-onboarding TM rules; PENDING-only super-users are primarily an investigations queue (REC 4), not double-counted here.${rec3CounterNote}`
      : `That cohort's fraud-ticket sum is ${fmtRawAmountMajor(Math.round(kycFraudAmt))} (~${kycAvgK}K avg × ${fmt(brief2b.fraud_count)} txns, exact sum) — addressable with post-onboarding TM rules; PENDING-only super-users are primarily an investigations queue (REC 4), not double-counted here.`;
  const top5Total     = bonus.top_fraudsters.reduce((s: number, f) => s + f.amount, 0);
  const top5FiatTotal =
    bonus.top_fraudsters.length > 0 && bonus.top_fraudsters.every((f) => typeof f.amount_gbp_fiat === "number")
      ? bonus.top_fraudsters.reduce((s: number, f) => s + (f.amount_gbp_fiat as number), 0)
      : null;
  const rec4CostLine =
    top5FiatTotal != null
      ? `Top 5 actors combined: ${fmtM(Math.round(top5FiatTotal))} on fiat GBP (FX-converted, ex crypto — same basis as executive fraud losses; raw AMOUNT sum ${fmtGbpFromAmount(Math.round(top5Total))}). Every day without nightly scoring is a day the ranked list goes un-actioned.`
      : `Top 5 actors combined: ${fmtGbpFromAmount(top5Total)} at risk. Every day without nightly scoring is a day the ranked list goes un-actioned.`;

  const recs = [
    {
      tag:"REC 1 · Brief 1",
      title:`Retire the ${brief1.marketing_rate}% conversion metric`,
      body:`Replace with ${brief1.revolut_rate}% — KYC-passed users with ≥1 legitimate card payment, the only signal of a revenue-positive primary account. If the ${brief1.marketing_rate}% headline is read as a share of registered users it implies ${fmt(brief1.marketing_implied_users ?? Math.ceil((brief1.unique_users * brief1.marketing_rate) / 100))} “converts” vs ${fmt(brief1.revolut_converted_users)} true — ${fmt(ghostMkt)} users appear revenue-ready under that reading but generate no interchange. Elaboration: align Finance, Growth, and FC on numerator and denominator; otherwise CAC payback models inherit optimistic user counts while fraud and credit teams see the true tail.`,
      ev:`${fmt(ghostMkt)}-user gap vs marketing-implied registered headcount (see Brief 1 funnel).`,
      cost:`Phantom interchange in planning — material cohort mis-sizing vs revenue-ready users; avoid attaching a fabricated £/user without an auditable ARPU source from Finance.`,
    },
    {
      tag:"REC 2 · Brief 2A",
      title:"Dual-axis geographic risk model",
      body:`Track ${hvC?.country} (volume: ${fmt(hvC?.fraud)} cases) and ${hrC?.country} (rate: ${hrC?.rate}%) on separate KPI dashboards with independent alert thresholds. A single volume-based view hides ${hrC?.country}'s rate — ${rateRatio}× higher. Pair the map with a channel-class split: merchant-facing (card + ATM) ${fmtRawAmountMajor(d.brief2a.fraud_amount_merchant_facing ?? 0)} vs platform (top-up + P2P + transfer) ${fmtRawAmountMajor(d.brief2a.fraud_amount_platform ?? 0)} so Brief 2B transfer signals are not misread as purely geographic. Elaboration: assign an owner for each axis (e.g. acquiring for volume, FC policy for rate) and review thresholds after every major product launch that shifts transaction mix.`,
      ev:`${hrC?.country} fraud rate ${hrC?.rate}% vs ${hvC?.country} ${hvC?.rate}% at a fraction of the volume.`,
      cost:`${hrC?.country}'s ${hrC?.rate}% rate represents ${fmtRawAmountMajor(hrC?.fraud_amount ?? 0)} in losses that targeted rate-based controls would have elevated to tier-1 priority.`,
    },
    {
      tag:"REC 3 · Brief 2B",
      title:"Layer behavioural rules on top of KYC",
      body:`Flag users where ATM share >25% (+${atmD}pp above baseline), bank transfer >15% (+${bankD}pp), or card payment <45%. Two or more signals within 30 days of registration should trigger enhanced due diligence. Add velocity on top-up → ATM / transfer paths and materially lower outbound limits while KYC is PENDING: in this extract, ${pendingFraudRate}% of PENDING-tagged transactions are fraud-labelled (${fmt(pendingFraud)} of ${fmt(pendingTot)})${brief2b.pending_fraud_txns_from_outlier != null && brief2b.pending_fraud_rate_ex_outlier != null ? `; excluding the single largest PENDING contributor (${brief2b.pending_fraud_outlier_user_id?.slice(0, 8) ?? "—"}…) the rate falls to ~${brief2b.pending_fraud_rate_ex_outlier}%` : ""}. “Wait for KYC” is not risk-neutral; actor-level containment (REC 4) remains separate for PENDING-heavy profiles.`,
      ev:`${fmt(brief2b.fraud_count)} fraud txns in the KYC-passed fraud cohort — identity cleared, behaviour abnormal.`,
      cost: rec3CostLine,
    },
    {
      tag:"REC 4 · Bonus",
      title:"Immediate action + nightly composite scoring",
      body:`Suspend ${top1?.full_id.slice(0,8)} (${scoreRatio}× second-ranked) immediately. Run composite scoring nightly across all ${fmt(bonus.total_fraudsters)} actors to surface emerging high-risk profiles before losses compound. Elaboration: publish the score and its four inputs to investigators so overrides are auditable; refresh inputs when new rails or corridors launch so the model does not silently go stale.`,
      ev:`${top1?.full_id.slice(0,8)}: ${fmt(top1?.txns)} txns across ${top1?.countries_hit} countries.`,
      cost: rec4CostLine,
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
              <strong>Dataset notes.</strong> {fmt(overview.total_txns)} transactions · {fmt(overview.unique_users)} unique users · raw volume {fmtRawAmountMajor(overview.total_amount)} · fiat GBP (ex crypto) {typeof overview.total_amount_gbp_fiat === "number" ? fmtM(overview.total_amount_gbp_fiat) : "—"} (FX {overview.fx_rates_as_of_utc ?? "—"}). No date column — 30-day registration window not applied. Geographic merchant table excludes blank <code>MERCHANT_COUNTRY</code>; user <code>COUNTRY</code> shown separately. Composite fraud-actor score uses max-normalised dimensions (see Section 5).
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

      <Footer n={10} total={TOTAL} />
    </ContentPage>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 10 — OPERATOR'S LENS: SEVERITY MATRIX + EXECUTIVE SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════
function OperatorLens({ d }: { d: Analytics }) {
  const { brief1, brief2b, bonus } = d;
  const kycFraudTotal = brief2b.fraud_amount_kyc_passed_cohort ?? brief2b.fraud_count * brief2b.fraud_avg_amount;
  const kycFraudFiat = brief2b.fraud_amount_kyc_passed_cohort_gbp_fiat;
  const kycRec3DisplayM =
    typeof kycFraudFiat === "number" ? Math.round(kycFraudFiat) : Math.round(kycFraudTotal);
  const top5Total     = bonus.top_fraudsters.reduce((s: number, f) => s + f.amount, 0);
  const top5FiatTotal =
    bonus.top_fraudsters.length > 0 && bonus.top_fraudsters.every((f) => typeof f.amount_gbp_fiat === "number")
      ? bonus.top_fraudsters.reduce((s: number, f) => s + (f.amount_gbp_fiat as number), 0)
      : null;
  const top1          = bonus.top_fraudsters[0];
  const avgTxnGbp     = top1 && top1.txns ? top1.amount / top1.txns : 0;
  const proj30dGbp    = top1 ? Math.round((top1.txns / 180) * 30 * avgTxnGbp) : 0;
  const proj30dSens   = top1 ? Math.round((top1.txns / 180) * 2 * 30 * avgTxnGbp) : 0;
  const rec4QuadrantDetail =
    top5FiatTotal != null
      ? `Top 5: ${fmtM(Math.round(top5FiatTotal))} on fiat GBP (raw AMOUNT ${fmtGbpFromAmount(Math.round(top5Total))}). Actor suspension: hours. Nightly composite scoring: days.`
      : `Top 5 actors: ${fmtGbpFromAmount(top5Total)} at risk. Actor suspension: hours. Nightly composite scoring: days.`;

  // 2×2 quadrant data  [ease: easy|hard, impact: high|low]
  const quadrants = [
    {
      ease: "easy", impact: "high",
      tag: "QUICK WIN · ACT TODAY",
      tagColor: INK,
      title: "REC 4 — Suspend Top Actors",
      detail: rec4QuadrantDetail,
      border: INK,
      bg: "#fafafa",
    },
    {
      ease: "hard", impact: "high",
      tag: "STRATEGIC BET · 3–6 MONTHS",
      tagColor: RED,
      title: "REC 3 — Behavioural Rule Engine",
      detail: `${fmtM(kycRec3DisplayM)} addressable on fiat GBP (same basis as Section 1 fraud losses). Requires rules pipeline + monitoring infra. Highest financial leverage.`,
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
      <div style={{
        padding: "10px 14px",
        borderTop: `1px solid ${RULE}`,
        borderRight: `1px solid ${RULE}`,
        borderBottom: `1px solid ${RULE}`,
        borderLeft: `3px solid ${RED}`,
        marginBottom: 14,
      }}>
        <p style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: RED, marginBottom: 5 }}>Forward-Looking Exposure Model</p>
        <Body>
          At <strong style={{ color: INK }}>{top1?.full_id.slice(0,8)}</strong>&apos;s run rate of {fmt(top1?.txns ?? 0)} transactions generating {fmtGbpFromAmount(top1?.amount ?? 0)}, and assuming <strong>a 6-month illustrative window</strong> (approximately {top1 ? (top1.txns/180).toFixed(1) : 0} txns/day at {fmtGbpFromAmount(Math.round(avgTxnGbp))} average; no event dates in extract),{" "}
          <strong style={{ color: RED }}>30 further days projects ~{fmtGbpFromAmount(proj30dGbp)} exposure at that run rate;</strong> at a <strong>3-month</strong> window the same logic ~doubles daily activity to ~{fmtGbpFromAmount(proj30dSens)} over 30 days.{" "}
          Risk compounds in real time: each detection cycle that passes without nightly scoring is a window where ranked actors continue operating unimpeded.
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

      <Footer n={11} total={TOTAL} />
    </ContentPage>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function ReportPage() {
  const [data, setData]     = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataOrigin, setDataOrigin] = useState<"bundled" | "custom">("bundled");

  useEffect(() => {
    const cached = readPersistedAnalytics();
    if (cached) {
      setData(cached);
      setDataOrigin("custom");
      setLoading(false);
      return;
    }
    fetch("/analytics.json")
      .then((r) => r.json())
      .then((d: Analytics) => {
        setData(d);
        setDataOrigin("bundled");
        setLoading(false);
      })
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
          {dataOrigin === "custom" && (
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.55)", marginLeft:12, padding:"2px 10px", borderRadius:99, background:"rgba(255,255,255,0.08)" }}>
              Same payload as dashboard (uploaded extract)
            </span>
          )}
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
      <div
        className="report-pages-container report-doc"
        style={{ paddingTop: 66, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}
      >
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

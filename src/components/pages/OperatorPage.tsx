"use client";

import type { Analytics } from "@/lib/types";
import MethodHint from "@/components/ui/MethodHint";
import { pageSubtitleParagraphStyle } from "@/components/ui/pageSubtitle";
import { ghostUsersVsMarketingClaim } from "@/lib/brief1Metrics";
import { fmtGbpFromAmount, fmtRawAmountMajor } from "@/lib/gbpMinor";

const fmt  = (n: number) => n.toLocaleString();
const fmtM = (n: number) => {
  if (n >= 1_000_000_000) return `£${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `£${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `£${(n / 1_000).toFixed(0)}K`;
  return `£${n}`;
};

interface Props { data: Analytics }

export default function OperatorPage({ data }: Props) {
  const { brief1, brief2b, bonus, brief2a } = data;

  const ghostMkt      = ghostUsersVsMarketingClaim(brief1);
  const kycFraudTotal = brief2b.fraud_amount_kyc_passed_cohort ?? brief2b.fraud_count * brief2b.fraud_avg_amount;
  const kycFraudFiat = brief2b.fraud_amount_kyc_passed_cohort_gbp_fiat;
  const kycRec3Display = typeof kycFraudFiat === "number" ? Math.round(kycFraudFiat) : Math.round(kycFraudTotal);
  const kycFiatTxnN = brief2b.fraud_txns_kyc_passed_cohort_fiat_gbp;
  const kycRec3Mean =
    typeof kycFraudFiat === "number" && typeof kycFiatTxnN === "number" && kycFiatTxnN > 0
      ? Math.round(kycFraudFiat / kycFiatTxnN)
      : typeof kycFraudFiat === "number" && brief2b.fraud_count > 0
        ? Math.round(kycFraudFiat / brief2b.fraud_count)
        : brief2b.fraud_avg_amount;
  const kycRec3FiatTxnLabel =
    typeof kycFiatTxnN === "number" ? fmt(kycFiatTxnN) : fmt(brief2b.fraud_count);
  const top5Total     = bonus.top_fraudsters.reduce((s, f) => s + f.amount, 0);
  const top5FiatTotal =
    bonus.top_fraudsters.length > 0 && bonus.top_fraudsters.every((f) => typeof f.amount_gbp_fiat === "number")
      ? bonus.top_fraudsters.reduce((s, f) => s + (f.amount_gbp_fiat as number), 0)
      : null;
  const top1          = bonus.top_fraudsters[0];
  const amountGbp     = top1 ? top1.amount : 0;
  const avgTxnGbp     = top1 && top1.txns ? amountGbp / top1.txns : 0;
  const dailyRate     = top1 ? top1.txns / 180 : 0;
  /** Same 6-mo window projection as the PDF report: `dailyRate × 30 × avgTxn` in raw `AMOUNT` units (GBP). */
  const proj30dGbp    = top1 ? Math.round(dailyRate * 30 * avgTxnGbp) : 0;
  const proj30dSens   = top1 ? Math.round(dailyRate * 2 * 30 * avgTxnGbp) : 0;
  const topRate       = [...brief2a.geo_risk].sort((a, b) => b.rate - a.rate)[0];

  const quadrants = [
    {
      ease: "easy", impact: "high",
      tag: "QUICK WIN · ACT TODAY",
      tagBg: "#0f0f0f", tagText: "#ffffff",
      title: "REC 4 — Suspend Top Actors + Nightly Scoring",
      value: top5FiatTotal != null ? fmtM(Math.round(top5FiatTotal)) : fmtGbpFromAmount(Math.round(top5Total)),
      sub:
        top5FiatTotal != null
          ? `fiat GBP (raw AMOUNT ${fmtGbpFromAmount(Math.round(top5Total))})`
          : "top-5 actors combined at risk",
      detail: "Actor suspension requires hours. Nightly composite scoring: days to ship. Highest immediacy.",
      border: "#0f0f0f", bg: "#ffffff",
    },
    {
      ease: "hard", impact: "high",
      tag: "STRATEGIC BET · 3–6 MONTHS",
      tagBg: "#fff1f0", tagText: "#cf1322",
      title: "REC 3 — Behavioural Rule Engine on KYC",
      value: fmtM(kycRec3Display),
      sub: typeof kycFraudFiat === "number" ? "addressable KYC-bypass fraud (fiat GBP)" : "addressable KYC-bypass fraud",
      detail: "Rules pipeline + real-time monitoring infra. Highest financial leverage of any recommendation.",
      border: "#cf1322", bg: "#fffafa",
    },
    {
      ease: "easy", impact: "low",
      tag: "HYGIENE · DAYS TO WEEKS",
      tagBg: "#f5f5f5", tagText: "#595959",
      title: "REC 1 + 2 — Metric Fix & Dual-Axis Geo",
      value: `${brief1.revolut_rate}%`,
      sub: `replaces ${brief1.marketing_rate}% — ${fmt(ghostMkt)}-user gap vs marketing-implied`,
      detail: "Reporting change + dashboard dual-axis. Eliminates structural planning blind spots.",
      border: "#e5e5e5", bg: "#fafafa",
    },
    {
      ease: "hard", impact: "low",
      tag: "NOT APPLICABLE",
      tagBg: "#f5f5f5", tagText: "#a3a3a3",
      title: "No recommendations in this quadrant",
      value: "—",
      sub: "no low-impact, high-effort actions proposed",
      detail: "All four recommendations have clear, positive ROI and a financial anchor.",
      border: "#ebebeb", bg: "#f8f8f8",
    },
  ];

  return (
    <div style={{ padding: "40px 48px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 8 }}>
          Operator&apos;s Lens
        </p>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <h1 style={{ flex: "1 1 auto", fontSize: 28, fontWeight: 800, color: "#0f0f0f", letterSpacing: "-0.03em", margin: 0 }}>
            Priority Matrix & Forward-Looking Model
          </h1>
          <MethodHint label="Matrix method">
            <p style={{ fontWeight: 600, marginBottom: 8 }}>How to read the grid</p>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              Axes are deliberately coarse: “easy” still means change management (REC 1 touches how the firm talks about growth). “Hard” reflects engineering and policy work for TM rules (REC 3). The forward-looking block uses the #1 actor’s run rate with an illustrative 6-month window (halve the horizon to 3 months and the 30-day band ~doubles) — a committee communication device, not a forecast model.
            </p>
          </MethodHint>
        </div>
        <p style={pageSubtitleParagraphStyle}>
          <strong style={{ color: "#171717" }}>Context.</strong> Rank actions by ease vs financial impact: top-left for immediate wins, top-right for sponsored roadmaps, bottom row for reporting hygiene that still prevents bad planning.
        </p>
        <p style={{ ...pageSubtitleParagraphStyle, marginTop: 12, color: "#404040", fontWeight: 500 }}>
          <strong style={{ color: "#171717" }}>Recommendation.</strong> Sequence REC 1–4 using the matrix together with the exposure strip below, and brief leadership using the same “monitoring in motion” narrative as the report’s executive summary.
        </p>
      </div>

      {/* Priority Matrix (aligned with PDF report Section 7) */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 16 }}>
          Priority Matrix — Ease of Implementation vs Financial Impact
        </p>

        {/* Proper grid: [y-label col] [easy col] [hard col] */}
        <div style={{ display: "grid", gridTemplateColumns: "18px 1fr 1fr", gridTemplateRows: "auto 1fr 1fr", gap: 12 }}>

          {/* Header row */}
          <div />
          {["← EASY TO IMPLEMENT", "HARDER TO IMPLEMENT →"].map(h => (
            <p key={h} style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
              color: "#a3a3a3", textAlign: "center", paddingBottom: 6,
            }}>{h}</p>
          ))}

          {/* HIGH IMPACT row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
              color: "#a3a3a3", writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap",
            }}>HIGH IMPACT</p>
          </div>
          {quadrants.filter(q => q.impact === "high").map(q => (
            <div key={q.title} style={{
              border: `2px solid ${q.border}`, borderRadius: 16, padding: "28px 32px",
              background: q.bg, display: "flex", flexDirection: "column", gap: 12,
            }}>
              <span style={{
                display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
                textTransform: "uppercase", padding: "4px 12px", borderRadius: 6,
                background: q.tagBg, color: q.tagText, alignSelf: "flex-start",
              }}>{q.tag}</span>
              <p style={{ fontSize: 17, fontWeight: 800, color: "#0f0f0f", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{q.title}</p>
              <div>
                <p style={{ fontSize: 32, fontWeight: 900, color: "#0f0f0f", letterSpacing: "-0.04em", lineHeight: 1 }}>{q.value}</p>
                <p style={{ fontSize: 12, color: "#a3a3a3", marginTop: 4 }}>{q.sub}</p>
              </div>
              <p style={{ fontSize: 13, color: "#737373", lineHeight: 1.6 }}>{q.detail}</p>
            </div>
          ))}

          {/* LOW IMPACT row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
              color: "#a3a3a3", writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap",
            }}>LOW IMPACT</p>
          </div>
          {quadrants.filter(q => q.impact === "low").map(q => (
            <div key={q.title} style={{
              border: `2px solid ${q.border}`, borderRadius: 16, padding: "28px 32px",
              background: q.bg, display: "flex", flexDirection: "column", gap: 12,
            }}>
              <span style={{
                display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
                textTransform: "uppercase", padding: "4px 12px", borderRadius: 6,
                background: q.tagBg, color: q.tagText, alignSelf: "flex-start",
              }}>{q.tag}</span>
              <p style={{ fontSize: 17, fontWeight: 800, color: "#0f0f0f", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{q.title}</p>
              <div>
                <p style={{ fontSize: 32, fontWeight: 900, color: "#0f0f0f", letterSpacing: "-0.04em", lineHeight: 1 }}>{q.value}</p>
                <p style={{ fontSize: 12, color: "#a3a3a3", marginTop: 4 }}>{q.sub}</p>
              </div>
              <p style={{ fontSize: 13, color: "#737373", lineHeight: 1.6 }}>{q.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Forward-Looking Model */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 16 }}>
          Forward-Looking Exposure Model
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
          {[
            { label: "Current run rate",       value: fmt(top1?.txns ?? 0),          sub: "transactions observed (est. 6-mo window)" },
            { label: "Avg transaction value",  value: top1 ? fmtGbpFromAmount(Math.round(top1.amount / top1.txns)) : "—",   sub: "per fraud-labelled transaction (mean AMOUNT)" },
            { label: "30-day projected loss",  value: fmtGbpFromAmount(proj30dGbp), sub: "if undetected for 30 more days", red: true },
          ].map(s => (
            <div key={s.label} style={{ border: `1px solid ${s.red ? "#fde8e8" : "#ebebeb"}`, borderRadius: 14, padding: "24px 28px", background: s.red ? "#fff8f8" : "#fafafa" }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: s.red ? "#cf1322" : "#a3a3a3", marginBottom: 10 }}>{s.label}</p>
              <p style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", color: s.red ? "#cf1322" : "#0f0f0f", lineHeight: 1, marginBottom: 6 }}>{s.value}</p>
              <p style={{ fontSize: 12, color: "#a3a3a3" }}>{s.sub}</p>
            </div>
          ))}
        </div>
        <div style={{ padding: "20px 24px", background: "#f9f9f9", border: "1px solid #ebebeb", borderLeft: "3px solid #cf1322", borderRadius: "0 12px 12px 0" }}>
          <p style={{ fontSize: 14, color: "#404040", lineHeight: 1.7 }}>
            At <strong style={{ color: "#0f0f0f" }}>{top1?.full_id.slice(0, 8)}</strong>&apos;s run rate of {fmt(top1?.txns ?? 0)} transactions generating {fmtGbpFromAmount(top1?.amount ?? 0)}, and assuming an illustrative 6-month window (approximately {top1 ? (top1.txns / 180).toFixed(1) : 0} txns/day at {top1 ? fmtGbpFromAmount(Math.round(top1.amount / top1.txns)) : "—"} average; no dates in extract),{" "}
            <strong style={{ color: "#cf1322" }}>30 further days projects ~{fmtGbpFromAmount(proj30dGbp)} exposure;</strong> at a 3-month window, ~{fmtGbpFromAmount(proj30dSens)} over the same 30-day band.{" "}
            With all {top1?.types_used} channels active across {top1?.countries_hit} countries, velocity — not footprint expansion — is the main remaining detection window.
          </p>
        </div>
      </div>

      {/* Cost of Inaction Summary */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 16 }}>
          Cost of Inaction — All Four Recommendations
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            {
              tag: "REC 1",
              title: `Retire the ${brief1.marketing_rate}% conversion metric`,
              cost: "Planning gap vs revenue-ready users",
              detail: `${fmt(ghostMkt)} users appear “converted” if the headline % is read against registered users but generate no interchange — Finance should own any £/user impact; do not invent ARPU from the extract.`,
            },
            {
              tag: "REC 2",
              title: "Dual-axis geographic risk model",
              cost: `${fmtRawAmountMajor(topRate?.fraud_amount ?? 0)} in deprioritised losses`,
              detail: `${topRate?.country}'s ${topRate?.rate}% fraud rate is invisible under a volume-only model — its losses are treated as low-priority.`,
            },
            {
              tag: "REC 3",
              title: "Behavioural rules on top of KYC",
              cost: `${fmtM(kycRec3Display)} in interceptable losses`,
              detail:
                typeof kycFraudFiat === "number"
                  ? `Fiat GBP on the KYC-passed cohort (${kycRec3FiatTxnLabel} txns with a fiat GBP conversion, ~${(kycRec3Mean / 1000).toFixed(1)}K mean in GBP; FX-converted, ex crypto — same basis as executive fraud losses) — behavioural rules target this stack; PENDING-heavy actors are a separate investigations track.`
                  : `Exact fraud-ticket sum on the KYC-passed cohort (${fmt(brief2b.fraud_count)} txns, ~${(brief2b.fraud_avg_amount / 1000).toFixed(1)}K mean) — behavioural rules target this stack; PENDING-heavy actors are a separate investigations track.`,
            },
            {
              tag: "REC 4",
              title: "Immediate action + nightly composite scoring",
              cost:
                top5FiatTotal != null
                  ? `${fmtM(Math.round(top5FiatTotal))} on fiat GBP (raw ${fmtGbpFromAmount(Math.round(top5Total))})`
                  : `${fmtGbpFromAmount(Math.round(top5Total))} top-5 combined at risk`,
              detail: `Every day without nightly composite scoring is a day the ranked list goes un-actioned. The #1 actor alone: ${fmtGbpFromAmount(top1?.amount ?? 0)}.`,
            },
          ].map((r, i) => (
            <div key={r.tag} style={{
              display: "flex", gap: 20, alignItems: "flex-start",
              padding: "18px 0", borderBottom: "1px solid #f0f0f0",
            }}>
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
                background: i === 3 ? "#0f0f0f" : "#f5f5f5", color: i === 3 ? "#fff" : "#404040",
                padding: "4px 10px", borderRadius: 6, flexShrink: 0, marginTop: 2,
              }}>{r.tag}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#0f0f0f", marginBottom: 4, letterSpacing: "-0.01em" }}>{r.title}</p>
                <p style={{ fontSize: 13, color: "#737373", lineHeight: 1.6 }}>{r.detail}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, minWidth: 140 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#cf1322", marginBottom: 4 }}>Cost if unaddressed</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: "#cf1322", letterSpacing: "-0.02em" }}>{r.cost}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

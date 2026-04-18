"use client";

import type { Analytics } from "@/lib/types";
import { notTrueConvertedUserCount } from "@/lib/brief1Metrics";

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

  const ghostUsers    = notTrueConvertedUserCount(brief1);
  const kycFraudTotal = brief2b.fraud_count * brief2b.fraud_avg_amount;
  const top5Total     = bonus.top_fraudsters.reduce((s, f) => s + f.amount, 0);
  const top1          = bonus.top_fraudsters[0];
  const avgTxnVal     = top1 ? top1.amount / top1.txns : 0;
  const proj30d       = Math.round((top1 ? top1.txns / 180 : 0) * 30 * avgTxnVal);
  const topRate       = [...brief2a.geo_risk].sort((a, b) => b.rate - a.rate)[0];

  const quadrants = [
    {
      ease: "easy", impact: "high",
      tag: "QUICK WIN · ACT TODAY",
      tagBg: "#0f0f0f", tagText: "#ffffff",
      title: "REC 4 — Suspend Top Actors + Nightly Scoring",
      value: fmtM(Math.round(top5Total)),
      sub: "top-5 actors combined at risk",
      detail: "Actor suspension requires hours. Nightly composite scoring: days to ship. Highest immediacy.",
      border: "#0f0f0f", bg: "#ffffff",
    },
    {
      ease: "hard", impact: "high",
      tag: "STRATEGIC BET · 3–6 MONTHS",
      tagBg: "#fff1f0", tagText: "#cf1322",
      title: "REC 3 — Behavioural Rule Engine on KYC",
      value: fmtM(Math.round(kycFraudTotal)),
      sub: "addressable KYC-bypass fraud",
      detail: "Rules pipeline + real-time monitoring infra. Highest financial leverage of any recommendation.",
      border: "#cf1322", bg: "#fffafa",
    },
    {
      ease: "easy", impact: "low",
      tag: "HYGIENE · DAYS TO WEEKS",
      tagBg: "#f5f5f5", tagText: "#595959",
      title: "REC 1 + 2 — Metric Fix & Dual-Axis Geo",
      value: `${brief1.revolut_rate}%`,
      sub: `replaces ${brief1.marketing_rate}% — ${fmt(ghostUsers)} ghost users removed`,
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
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f0f0f", letterSpacing: "-0.03em", marginBottom: 10 }}>
          Priority Matrix & Forward-Looking Model
        </h1>
        <p style={{ fontSize: 14, color: "#737373", lineHeight: 1.6, maxWidth: 640 }}>
          Ranked by ease of implementation vs financial impact.
        </p>
      </div>

      {/* Severity Matrix */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 16 }}>
          Severity Matrix — Ease of Implementation vs Financial Impact
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
            { label: "Avg transaction value",  value: fmtM(Math.round(avgTxnVal)),   sub: `per transaction — dc283b17` },
            { label: "30-day projected loss",  value: fmtM(proj30d),                 sub: "if undetected for 30 more days", red: true },
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
            At <strong style={{ color: "#0f0f0f" }}>{top1?.full_id.slice(0, 8)}</strong>&apos;s run rate of {fmt(top1?.txns ?? 0)} transactions generating {fmtM(top1?.amount ?? 0)}, and assuming a 6-month observation window (approximately {top1 ? (top1.txns / 180).toFixed(1) : 0} transactions per day at {fmtM(Math.round(avgTxnVal))} average),{" "}
            <strong style={{ color: "#cf1322" }}>30 additional days without intervention projects {fmtM(proj30d)} in further exposure.</strong>{" "}
            With all {top1?.types_used} transaction channels active across {top1?.countries_hit} countries, velocity — not footprint expansion — is the only remaining detection window. Risk compounds in real time: each detection cycle that passes without nightly scoring is a window where ranked actors continue operating unimpeded.
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
              title: "Retire the 79.21% conversion metric",
              cost: `~${fmtM(ghostUsers * 90)} in phantom revenue per cohort`,
              detail: `${fmt(ghostUsers)} ghost-converted users × £90 annual ARPU — a conservative industry benchmark for neobank interchange revenue. A planning error that compounds with every acquisition campaign.`,
            },
            {
              tag: "REC 2",
              title: "Dual-axis geographic risk model",
              cost: `${fmtM(topRate?.fraud_amount ?? 0)} in deprioritised losses`,
              detail: `${topRate?.country}'s ${topRate?.rate}% fraud rate is invisible under a volume-only model — its losses are treated as low-priority.`,
            },
            {
              tag: "REC 3",
              title: "Behavioural rules on top of KYC",
              cost: `${fmtM(Math.round(kycFraudTotal))} in interceptable losses`,
              detail: `${fmt(brief2b.fraud_count)} fraud transactions × £${(brief2b.fraud_avg_amount / 1000).toFixed(1)}K average — all from KYC-passed users that behavioural rules would have flagged.`,
            },
            {
              tag: "REC 4",
              title: "Immediate action + nightly composite scoring",
              cost: `${fmtM(Math.round(top5Total))} top-5 combined at risk`,
              detail: `Every day without nightly composite scoring is a day the ranked list goes un-actioned. The #1 actor alone: ${fmtM(top1?.amount ?? 0)}.`,
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

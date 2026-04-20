"use client";

import FraudstersAuditBlock from "@/components/FraudstersAuditBlock";
import MetricCard from "@/components/ui/MetricCard";
import PageHeader from "@/components/ui/PageHeader";
import type { Fraudster } from "@/lib/types";
import { fmtGbpFromMinor } from "@/lib/gbpMinor";

const fmt = (n: number) => n.toLocaleString();

export default function FraudstersPage({
  fraudsters,
  byAmount,
  totalFraudsters,
}: {
  fraudsters: Fraudster[];
  byAmount?: Fraudster[];
  totalFraudsters: number;
}) {
  const top = fraudsters[0];
  const compositeIds = new Set(fraudsters.map((f) => f.full_id));
  const naiveIds = new Set((byAmount ?? []).map((f) => f.full_id));
  const overlap = byAmount?.length
    ? [...compositeIds].filter((id) => naiveIds.has(id)).length
    : null;

  return (
    <div style={{ padding: "48px 56px", maxWidth: 1100, margin: "0 auto" }}>
      <PageHeader
        overline="Bonus"
        title="Top 5 Priority Fraudsters"
        description={`Naive top 5 by fraud £ is shown next to composite top 5 from ${fmt(totalFraudsters)} fraud actors so investigators can contrast headline loss with forward-looking, cross-rail risk.`}
        recommendation="Run composite nightly on the full fraud-user population and auto-queue the top decile for enhanced review; treat channel diversity plus cross-border use on #1 as a hard escalation."
        methodology={
          <>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>fin_crime_audit.pdf alignment</p>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              Composite score = 0.35·fraud value + 0.30·fraud txn count + 0.15·user fraud rate + 0.10·type diversity + 0.10·country diversity (each input normalised 0–1 across all fraud actors). Displayed score is 0–100 (weighted sum × 100). Naive ranking uses raw fraud £ only. GBP = source <code>AMOUNT</code> ÷ 100.
            </p>
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
        <MetricCard
          label="Fraud actors in extract"
          value={fmt(totalFraudsters)}
          sub="population for normalisation"
        />
        <MetricCard
          label="#1 composite score"
          value={top ? top.score.toFixed(1) : "—"}
          sub={top ? top.id : "no ranked rows"}
          badge={top && top.kyc !== "PASSED" ? top.kyc : undefined}
          badgeVariant={top && top.kyc !== "PASSED" ? "amber" : undefined}
        />
        <MetricCard
          label="#1 fraud volume"
          value={top ? fmtGbpFromMinor(top.amount) : "—"}
          sub="same actor as top composite row"
          badgeVariant="red"
        />
        {overlap != null && (
          <MetricCard
            label="Naive ↔ composite overlap"
            value={`${overlap} / 5`}
            sub="users on both top-5 lists"
            badge={overlap < 5 ? `${5 - overlap} rank-only` : "full overlap"}
            badgeVariant={overlap === 5 ? "green" : "slate"}
          />
        )}
      </div>

      <FraudstersAuditBlock composite={fraudsters} byAmount={byAmount} variant="page" totalFraudsters={totalFraudsters} />
    </div>
  );
}

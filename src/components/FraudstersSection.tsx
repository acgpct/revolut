"use client";

import FraudstersAuditBlock from "./FraudstersAuditBlock";
import SectionCard from "./SectionCard";
import type { Fraudster } from "@/lib/types";

interface Props {
  fraudsters: Fraudster[];
  byAmount?: Fraudster[];
  totalFraudsters: number;
}

const fmt = (n: number) => n.toLocaleString();

export default function FraudstersSection({ fraudsters, byAmount, totalFraudsters }: Props) {
  return (
    <SectionCard
      tag="Bonus"
      tagColor="black"
      title="Top 5 Priority Fraudsters"
      subtitle={`Naive £ vs composite priority ranking across ${fmt(totalFraudsters)} fraud actors — open Method (i) on the dashboard Top Fraudsters tab for the scoring formula.`}
    >
      <FraudstersAuditBlock composite={fraudsters} byAmount={byAmount} variant="section" totalFraudsters={totalFraudsters} />
    </SectionCard>
  );
}

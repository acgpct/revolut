"use client";

import type { ReactNode } from "react";
import { pageRecommendationParagraphStyle, pageSubtitleParagraphStyle } from "./pageSubtitle";
import MethodHint from "./MethodHint";

interface Props {
  overline?: string;
  title: string;
  /** Short context only (what this view is for). */
  description?: string;
  /** Action / governance ask — shown under context. */
  recommendation?: string;
  /** Definitions, formulas, cohort rules — hover “i” only. */
  methodology?: ReactNode;
}

export default function PageHeader({ overline, title, description, recommendation, methodology }: Props) {
  const hasSub = Boolean(description || recommendation);
  return (
    <div style={{ marginBottom: 40 }}>
      {overline && (
        <p style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#a3a3a3",
          marginBottom: 8,
        }}>
          {overline}
        </p>
      )}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: hasSub ? 10 : 0,
      }}>
        <h1 style={{
          flex: "1 1 auto",
          fontSize: 26,
          fontWeight: 700,
          color: "#0f0f0f",
          letterSpacing: "-0.03em",
          lineHeight: 1.2,
          margin: 0,
        }}>
          {title}
        </h1>
        {methodology ? <MethodHint>{methodology}</MethodHint> : null}
      </div>
      {description && (
        <p style={pageSubtitleParagraphStyle}>
          {description}
        </p>
      )}
      {recommendation && (
        <p style={pageRecommendationParagraphStyle}>
          <strong style={{ color: "#171717", fontWeight: 600 }}>Recommendation.</strong>{" "}
          {recommendation}
        </p>
      )}
    </div>
  );
}

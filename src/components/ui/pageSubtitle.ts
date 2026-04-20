import type { CSSProperties } from "react";

/**
 * Paragraph under page H1 or section title: spans the same horizontal band as grids/cards below
 * (no narrow max-width). Justified lines with a natural last line.
 */
export const pageSubtitleParagraphStyle: CSSProperties = {
  fontSize: 14,
  color: "#737373",
  lineHeight: 1.65,
  width: "100%",
  maxWidth: "100%",
  fontWeight: 400,
  margin: 0,
  textAlign: "justify",
  textAlignLast: "left",
};

/** Second line under page H1 — recommendation / action (keeps “method” in MethodHint only). */
export const pageRecommendationParagraphStyle: CSSProperties = {
  ...pageSubtitleParagraphStyle,
  marginTop: 12,
  color: "#404040",
  fontWeight: 500,
};

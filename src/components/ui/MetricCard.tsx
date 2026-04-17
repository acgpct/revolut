"use client";

import { ReactNode } from "react";

interface Props {
  label: string;
  value: string;
  sub?: string;
  badge?: string;
  badgeVariant?: "red" | "amber" | "green" | "slate";
  icon?: ReactNode;
}

const badgeColors = {
  red:   { bg: "#fff1f0", color: "#cf1322" },
  amber: { bg: "#fffbe6", color: "#ad6800" },
  green: { bg: "#f6ffed", color: "#389e0d" },
  slate: { bg: "#f5f5f5", color: "#595959" },
};

export default function MetricCard({ label, value, sub, badge, badgeVariant = "slate" }: Props) {
  const bc = badgeColors[badgeVariant];
  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid #ebebeb",
      borderRadius: 12,
      padding: "24px 28px",
      display: "flex",
      flexDirection: "column",
      gap: 0,
    }}>
      <p style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "#a3a3a3",
        marginBottom: 10,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 32,
        fontWeight: 700,
        color: "#0f0f0f",
        letterSpacing: "-0.03em",
        lineHeight: 1,
        marginBottom: 10,
      }}>
        {value}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minHeight: 20 }}>
        {badge && (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 6,
            background: bc.bg,
            color: bc.color,
            letterSpacing: "0.01em",
          }}>
            {badge}
          </span>
        )}
        {sub && (
          <span style={{ fontSize: 12, color: "#a3a3a3" }}>{sub}</span>
        )}
      </div>
    </div>
  );
}

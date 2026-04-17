"use client";

import { ReactNode } from "react";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  color: "accent" | "danger" | "success" | "warning" | "neutral";
  trend?: string;
}

const palette = {
  accent:  { trend: "#3b3ef4", trendBg: "#eef2ff" },
  danger:  { trend: "#dc2626", trendBg: "#fef2f2" },
  success: { trend: "#16a34a", trendBg: "#f0fdf4" },
  warning: { trend: "#d97706", trendBg: "#fffbeb" },
  neutral: { trend: "#6b7280", trendBg: "#f9fafb" },
};

export default function KPICard({ title, value, subtitle, icon, color, trend }: KPICardProps) {
  const p = palette[color];
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #f0f0f0",
      borderRadius: 16,
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      gap: 14,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{
          fontSize: 11, fontWeight: 600, color: "#9ca3af",
          textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          {title}
        </span>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "#f9fafb",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#9ca3af",
        }}>
          {icon}
        </div>
      </div>

      <p style={{
        fontSize: 28, fontWeight: 800,
        letterSpacing: "-0.035em", color: "#000", lineHeight: 1,
      }}>
        {value}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
        {trend && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
            background: p.trendBg, color: p.trend, letterSpacing: "0.01em",
          }}>
            {trend}
          </span>
        )}
        {subtitle && (
          <span style={{ fontSize: 12, color: "#9ca3af", letterSpacing: "0.01em" }}>{subtitle}</span>
        )}
      </div>
    </div>
  );
}

"use client";

import { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  tag?: string;
  tagColor?: "black" | "red" | "amber" | "green";
  children: ReactNode;
}

const tags = {
  black: { bg: "#000", color: "#fff" },
  red:   { bg: "#fef2f2", color: "#dc2626" },
  amber: { bg: "#fffbeb", color: "#b45309" },
  green: { bg: "#f0fdf4", color: "#15803d" },
};

export default function SectionCard({ title, subtitle, tag, tagColor = "black", children }: SectionCardProps) {
  const t = tags[tagColor];
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #f0f0f0",
      borderRadius: 20,
      padding: "36px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      display: "flex",
      flexDirection: "column",
      gap: 32,
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          {tag && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5,
              background: t.bg, color: t.color,
              textTransform: "uppercase", letterSpacing: "0.1em",
            }}>
              {tag}
            </span>
          )}
          <h2 style={{
            fontSize: 18, fontWeight: 800, color: "#000",
            letterSpacing: "-0.025em", lineHeight: 1.2,
          }}>
            {title}
          </h2>
        </div>
        {subtitle && (
          <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, maxWidth: 660, letterSpacing: "-0.005em" }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Thin rule */}
      <div style={{ height: 1, background: "#f5f5f5", marginTop: -16 }} />

      {children}
    </div>
  );
}

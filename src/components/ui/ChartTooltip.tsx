"use client";

import type { CSSProperties, ReactNode } from "react";

export type ChartTooltipVariant = "dashboard" | "report";

const shell: Record<ChartTooltipVariant, CSSProperties> = {
  dashboard: {
    background: "#ffffff",
    border: "1px solid #ebebeb",
    borderRadius: 12,
    padding: "12px 14px",
    boxShadow: "0 8px 28px rgba(15, 15, 15, 0.1)",
    minWidth: 172,
    maxWidth: 300,
    fontSize: 12,
    lineHeight: 1.45,
  },
  report: {
    background: "#ffffff",
    border: "1px solid #e8e8e8",
    borderRadius: 8,
    padding: "8px 11px",
    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.08)",
    minWidth: 140,
    maxWidth: 240,
    fontSize: 10,
    lineHeight: 1.45,
  },
};

const titleStyle = (v: ChartTooltipVariant): CSSProperties =>
  v === "dashboard"
    ? {
        fontSize: 13,
        fontWeight: 600,
        color: "#171717",
        letterSpacing: "-0.02em",
        margin: "0 0 10px",
        paddingBottom: 8,
        borderBottom: "1px solid #f0f0f0",
      }
    : {
        fontSize: 10,
        fontWeight: 700,
        color: "#0f0f0f",
        margin: "0 0 6px",
        paddingBottom: 4,
        borderBottom: "1px solid #e8e8e8",
      };

const labelMuted = (v: ChartTooltipVariant) => (v === "dashboard" ? "#737373" : "#5a5a5a");
const valueStrong = (v: ChartTooltipVariant) => (v === "dashboard" ? "#0f0f0f" : "#0f0f0f");

export function ChartTooltipRoot({
  children,
  variant = "dashboard",
  style,
}: {
  children: ReactNode;
  variant?: ChartTooltipVariant;
  style?: CSSProperties;
}) {
  return <div style={{ ...shell[variant], ...style }}>{children}</div>;
}

export function ChartTooltipTitle({
  children,
  variant = "dashboard",
}: {
  children: ReactNode;
  variant?: ChartTooltipVariant;
}) {
  return <p style={{ ...titleStyle(variant), marginTop: 0 }}>{children}</p>;
}

/** Muted overline under the title (e.g. tier / category). */
export function ChartTooltipSubtitle({
  children,
  variant = "dashboard",
}: {
  children: ReactNode;
  variant?: ChartTooltipVariant;
}) {
  return (
    <p
      style={{
        fontSize: variant === "dashboard" ? 10 : 8,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: variant === "dashboard" ? "#a3a3a3" : "#9a9a9a",
        margin: variant === "dashboard" ? "0 0 10px" : "0 0 6px",
      }}
    >
      {children}
    </p>
  );
}

export function ChartTooltipRows({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>;
}

export function ChartTooltipRow({
  label,
  value,
  variant = "dashboard",
  valueColor,
}: {
  label: string;
  value: ReactNode;
  variant?: ChartTooltipVariant;
  valueColor?: string;
}) {
  const fs = variant === "dashboard" ? 12 : 10;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 20,
        fontSize: fs,
      }}
    >
      <span style={{ color: labelMuted(variant), flex: "1 1 auto", minWidth: 0 }}>{label}</span>
      <span
        style={{
          fontWeight: 600,
          color: valueColor ?? valueStrong(variant),
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function ChartTooltipFooter({
  children,
  variant = "dashboard",
}: {
  children: ReactNode;
  variant?: ChartTooltipVariant;
}) {
  return (
    <p
      style={{
        margin: variant === "dashboard" ? "10px 0 0" : "8px 0 0",
        paddingTop: variant === "dashboard" ? 8 : 6,
        borderTop: `1px solid ${variant === "dashboard" ? "#f0f0f0" : "#ebebeb"}`,
        fontSize: variant === "dashboard" ? 11 : 9,
        color: variant === "dashboard" ? "#a3a3a3" : "#9a9a9a",
        fontWeight: 500,
        marginBottom: 0,
      }}
    >
      {children}
    </p>
  );
}

export type ChartTooltipPayloadItem = {
  name?: string | number;
  value?: unknown;
  color?: string;
};

/** Recharts payload tooltip: optional category title + label/value rows. */
export function ChartTooltipFromPayload({
  active,
  payload,
  label,
  variant = "dashboard",
  formatValue = (v: unknown) => (typeof v === "number" ? v.toLocaleString() : String(v)),
}: {
  active?: boolean;
  payload?: readonly ChartTooltipPayloadItem[];
  label?: string | number;
  variant?: ChartTooltipVariant;
  formatValue?: (v: unknown) => string;
}) {
  if (!active || !payload?.length) return null;
  const showLabel = label != null && label !== "";
  return (
    <ChartTooltipRoot variant={variant}>
      {showLabel && <ChartTooltipTitle variant={variant}>{label}</ChartTooltipTitle>}
      <ChartTooltipRows>
        {payload.map((p, i) => (
          <ChartTooltipRow
            key={String(p.name ?? i)}
            variant={variant}
            label={String(p.name ?? "—")}
            value={formatValue(p.value)}
            valueColor={p.color}
          />
        ))}
      </ChartTooltipRows>
    </ChartTooltipRoot>
  );
}

"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { ScatterShapeProps } from "recharts";
import type { GeoRisk } from "@/lib/types";
import MethodHint from "@/components/ui/MethodHint";
import {
  ChartTooltipRoot,
  ChartTooltipTitle,
  ChartTooltipSubtitle,
  ChartTooltipRows,
  ChartTooltipRow,
} from "@/components/ui/ChartTooltip";

const fmt = (n: number) => n.toLocaleString();
const fmtM = (n: number) => {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}K`;
  return `£${n}`;
};

const shortLabel = (c: string) => (c === "Unknown / Null" ? "N/A" : c);

const RED = "#cf1322";
const AMBER = "#ad6800";
const BASE = "#b4c5d6";

export type GeoBubbleRow = GeoRisk & {
  /** ≥1 for log-scale X */
  fraudX: number;
  tier: "red" | "amber" | "base";
  fill: string;
  labelCode: string;
};

/** Red = #1 fraud volume; amber = other high-rate or high-volume candidates (matches dual-axis story). */
export function buildGeoBubbleRows(geo: GeoRisk[]): GeoBubbleRow[] {
  if (!geo.length) return [];
  const byVol = [...geo].sort((a, b) => b.fraud - a.fraud);
  const byRate = [...geo].sort((a, b) => b.rate - a.rate);
  const redCountry = byVol[0].country;
  const amber = new Set<string>();
  for (const r of byRate.slice(0, 6)) {
    if (r.country !== redCountry) amber.add(r.country);
  }
  for (const r of byVol.slice(0, 6)) {
    if (r.country !== redCountry) amber.add(r.country);
  }

  const rows: GeoBubbleRow[] = geo.map((g) => {
    const fraudX = Math.max(g.fraud, 1);
    const labelCode = shortLabel(g.country);
    if (g.country === redCountry) {
      return { ...g, fraudX, tier: "red" as const, fill: RED, labelCode };
    }
    if (amber.has(g.country)) {
      return { ...g, fraudX, tier: "amber" as const, fill: AMBER, labelCode };
    }
    return { ...g, fraudX, tier: "base" as const, fill: BASE, labelCode };
  });

  const tierOrder = (t: GeoBubbleRow["tier"]) => (t === "base" ? 0 : t === "amber" ? 1 : 2);
  return [...rows].sort((a, b) => tierOrder(a.tier) - tierOrder(b.tier));
}

function BubbleTip({ active, payload }: { active?: boolean; payload?: { payload: GeoBubbleRow }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const tierLabel = d.tier === "red" ? "Anchor (highest fraud volume)" : d.tier === "amber" ? "Highlighted candidate" : "Other (meets min n)";
  return (
    <ChartTooltipRoot style={{ minWidth: 200, maxWidth: 280 }}>
      <ChartTooltipTitle>{d.country}</ChartTooltipTitle>
      <ChartTooltipSubtitle>{tierLabel}</ChartTooltipSubtitle>
      <ChartTooltipRows>
        <ChartTooltipRow label="Fraud txns" value={fmt(d.fraud)} valueColor={RED} />
        <ChartTooltipRow label="Fraud rate" value={`${d.rate}%`} />
        <ChartTooltipRow label="Total txns (bubble size)" value={fmt(d.total)} />
        <ChartTooltipRow label="Fraud loss" value={fmtM(d.fraud_amount)} valueColor={RED} />
      </ChartTooltipRows>
    </ChartTooltipRoot>
  );
}

/** Place anchor label left of bubble when fraud volume is large (avoids right-edge clip). */
function GeoBubbleShape(props: ScatterShapeProps) {
  const cx = props.cx != null ? Number(props.cx) : NaN;
  const cy = props.cy != null ? Number(props.cy) : NaN;
  const w = Number(props.width) || 12;
  const h = Number(props.height) || 12;
  const r = Math.max(4, Math.min(w, h) / 2);
  const payload = props.payload as GeoBubbleRow | undefined;
  if (!payload || Number.isNaN(cx) || Number.isNaN(cy)) return null;
  const stroke = payload.tier === "red" || payload.tier === "amber" ? "#0f0f0f" : "rgba(15,15,15,0.12)";
  const sw = payload.tier === "red" || payload.tier === "amber" ? 1.25 : 0.75;
  const labelLeft = payload.tier === "red" && payload.fraudX >= 120;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={payload.fill} stroke={stroke} strokeWidth={sw} />
      {payload.tier === "red" && (
        <text
          x={labelLeft ? cx - r - 8 : cx}
          y={labelLeft ? cy + 4 : cy - r - 8}
          textAnchor={labelLeft ? "end" : "middle"}
          fontSize={11}
          fontWeight={700}
          fill="#0f0f0f"
          style={{ fontFamily: "inherit" }}
        >
          {payload.labelCode}
        </text>
      )}
    </g>
  );
}

type Props = {
  geo: GeoRisk[];
  /** ≥50 matches Brief 2A pipeline */
  minN?: number;
  height?: number;
  /** Slightly tighter margins on the full page layout */
  compact?: boolean;
};

export default function GeographicRiskBubbleChart({ geo, minN = 50, height = 360, compact }: Props) {
  const data = buildGeoBubbleRows(geo);
  const maxRate = Math.max(...data.map((d) => d.rate), 1);
  const yMax = Math.min(24, Math.max(8, Math.ceil((maxRate * 1.18) / 2) * 2));
  const maxFraud = Math.max(...data.map((d) => d.fraud), 1);
  const minFraud = Math.max(1, Math.min(...data.map((d) => d.fraud)));
  const xHi = Math.max(maxFraud * 2.2, minFraud * 12);

  const m = compact
    ? { top: 36, right: 52, bottom: 58, left: 14 }
    : { top: 32, right: 36, bottom: 56, left: 16 };

  const axisLabelStyle = { fontSize: compact ? 10 : 11, fill: "#6b6b80", fontWeight: 600 as const };

  const amberCodes = [...data]
    .filter((d) => d.tier === "amber")
    .sort((a, b) => b.rate - a.rate || b.fraud - a.fraud)
    .map((d) => d.labelCode);

  const methodology = (
    <>
      <p style={{ fontWeight: 600, marginBottom: 8 }}>How this chart is built</p>
      <p style={{ margin: "0 0 8px", lineHeight: 1.6 }}>
        Each point is one <code>MERCHANT_COUNTRY</code> in the Brief 2A pipeline (min {minN} total transactions).{" "}
        <strong>X</strong> = fraud transaction count (log scale). <strong>Y</strong> = fraud rate (%).{" "}
        <strong>Bubble area</strong> scales with total (fraud + legit) transaction volume for that country.
      </p>
      <p style={{ margin: 0, lineHeight: 1.6 }}>
        <strong style={{ color: RED }}>Red</strong> = single anchor: #1 country by fraud <em>volume</em>.{" "}
        <strong style={{ color: AMBER }}>Amber</strong> = union of top 6 by rate and top 6 by volume (excluding the anchor).{" "}
        <strong>Grey-blue</strong> = all other eligible countries. Amber codes are listed under the chart so labels do not overlap in dense corners.
      </p>
    </>
  );

  return (
    <div style={{ overflow: "visible" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: compact ? 10 : 12 }}>
        <p
          style={{
            fontSize: compact ? 12 : 13,
            fontWeight: 700,
            color: "#171717",
            margin: 0,
            letterSpacing: "-0.01em",
            lineHeight: 1.35,
            flex: 1,
            minWidth: 0,
          }}
        >
          Geographic risk: volume vs. probability (by merchant country, min n={minN})
        </p>
        <MethodHint label="Chart method">{methodology}</MethodHint>
      </div>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={m}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical />
            <XAxis
              type="number"
              dataKey="fraudX"
              scale="log"
              domain={[minFraud, xHi]}
              allowDataOverflow={false}
              tick={{ fill: "#a3a3a3", fontSize: compact ? 10 : 11, fontFamily: "inherit" }}
              axisLine={{ stroke: "#ebebeb" }}
              tickLine={{ stroke: "#ebebeb" }}
              tickFormatter={(v: number) => {
                if (v >= 10_000) return `${Math.round(v / 1000)}k`;
                if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
                return String(Math.round(v));
              }}
              label={{
                value: "Fraud txns (log) → volume",
                position: "bottom",
                offset: compact ? 38 : 40,
                style: axisLabelStyle,
              }}
            />
            <YAxis
              type="number"
              dataKey="rate"
              domain={[0, yMax]}
              tickCount={compact ? 8 : 9}
              tick={{ fill: "#a3a3a3", fontSize: compact ? 10 : 11, fontFamily: "inherit" }}
              axisLine={{ stroke: "#ebebeb" }}
              tickLine={{ stroke: "#ebebeb" }}
              tickFormatter={(v: number) => `${v}%`}
              label={{
                value: "Fraud rate (%) → probability",
                angle: -90,
                position: "insideLeft",
                offset: compact ? 2 : 4,
                style: axisLabelStyle,
              }}
            />
            <ZAxis type="number" dataKey="total" range={[compact ? 32 : 40, compact ? 120 : 150]} />
            <Tooltip cursor={{ strokeDasharray: "4 4", stroke: "#a3a3a3" }} content={<BubbleTip />} />
            <Scatter data={data} shape={GeoBubbleShape} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {amberCodes.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: "#a3a3a3", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
            Highlighted countries (hover any bubble for numbers)
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {amberCodes.map((code) => (
              <span
                key={code}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#92400e",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: 6,
                  padding: "3px 8px",
                  fontFamily: "monospace",
                }}
              >
                {code}
              </span>
            ))}
          </div>
        </div>
      )}

      <p style={{ fontSize: 12, color: "#525252", lineHeight: 1.55, marginTop: 12, marginBottom: 4 }}>
        <strong style={{ color: "#171717" }}>Context.</strong> Volume answers “where are we busy?”; rate answers “where is each transaction most dangerous?”. A country can be huge on volume but modest on rate — or the reverse.
      </p>
      <p style={{ fontSize: 12, color: "#525252", lineHeight: 1.55, margin: 0 }}>
        <strong style={{ color: "#171717" }}>Recommendation.</strong> Run separate dashboards and owners for top fraud <em>count</em> vs top fraud <em>rate</em>; do not collapse both into one “heat map” prioritisation.
      </p>
    </div>
  );
}

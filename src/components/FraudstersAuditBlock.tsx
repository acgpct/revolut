"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartTooltipRoot,
  ChartTooltipTitle,
  ChartTooltipRows,
  ChartTooltipRow,
  ChartTooltipFooter,
  ChartTooltipFromPayload,
} from "@/components/ui/ChartTooltip";
import Panel from "@/components/ui/Panel";
import type { Fraudster } from "@/lib/types";
import { fmtGbpFromAmount } from "@/lib/gbpMinor";

const fmt = (n: number) => n.toLocaleString();

function fmtAxisGbp(n: number) {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `£${(n / 1000).toFixed(0)}k`;
  return `£${Math.round(n)}`;
}

const DIM_COLORS = {
  dmg: "#991b1b",
  vol: "#b45309",
  rate: "#ca8a04",
  types: "#4b5563",
  geo: "#64748b",
} as const;

function hasDims(f: Fraudster) {
  return (
    f.w_value != null &&
    f.w_txns != null &&
    f.w_rate != null &&
    f.w_types != null &&
    f.w_geo != null
  );
}

function FraudsterDossierTable({
  rows,
  title,
  ink,
  muted,
  rule,
  subtle,
  compact,
  dense,
  /** Larger type, roomier cells, full user id — dashboard page dossier only. */
  comfortable,
}: {
  rows: Fraudster[];
  title: string;
  ink: string;
  muted: string;
  rule: string;
  subtle: string;
  compact?: boolean;
  dense?: boolean;
  comfortable?: boolean;
}) {
  const th = dense ? 8 : comfortable ? 12 : compact ? 10 : 11;
  const td = dense ? 10 : comfortable ? 14 : compact ? 12 : 13;
  const pad = dense ? "5px 6px" : comfortable ? "14px 16px" : compact ? "8px 10px" : "10px 12px";
  const headerColor = comfortable ? "#737373" : subtle;
  const titleColor = comfortable ? "#525252" : subtle;
  const userFont = comfortable ? 12 : dense ? 9 : compact ? 11 : 12;
  const headers = ["#", "User ID", "Fraud txns", "Fraud £", "Types", "Countries", "KYC", "Score"] as const;

  return (
    <div>
      <p
        style={{
          fontSize: dense ? 8.5 : comfortable ? 12 : compact ? 10 : 11,
          fontWeight: 700,
          letterSpacing: comfortable ? "0.06em" : "0.08em",
          textTransform: "uppercase",
          color: titleColor,
          marginBottom: dense ? 6 : comfortable ? 12 : compact ? 8 : 10,
        }}
      >
        {title}
      </p>
      <div
        style={{
          border: `1px solid ${rule}`,
          borderRadius: compact ? 10 : 12,
          overflow: "hidden",
          background: "#ffffff",
        }}
      >
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table
            style={{
              width: "100%",
              minWidth: comfortable ? 720 : 0,
              borderCollapse: "collapse",
              fontSize: td,
              tableLayout: comfortable ? "fixed" : "auto",
            }}
          >
            {comfortable ? (
              <colgroup>
                <col style={{ width: 48 }} />
                <col style={{ width: "32%" }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 72 }} />
                <col style={{ width: 88 }} />
                <col style={{ width: 72 }} />
                <col style={{ width: 72 }} />
              </colgroup>
            ) : null}
            <thead>
              <tr style={{ background: "#fafafa", borderBottom: `1px solid ${rule}` }}>
                {headers.map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: pad,
                      textAlign: h === "Score" ? "right" : "left",
                      fontSize: th,
                      fontWeight: 700,
                      color: headerColor,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: h === "User ID" ? "normal" : "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((f, i) => (
                <tr key={f.full_id} style={{ borderTop: `1px solid ${rule}` }}>
                  <td style={{ padding: pad, fontWeight: 800, color: ink, verticalAlign: "top" }}>{i + 1}</td>
                  <td
                    title={f.full_id}
                    style={{
                      padding: pad,
                      fontFamily: "ui-monospace, monospace",
                      fontSize: userFont,
                      color: muted,
                      wordBreak: "break-all",
                      lineHeight: 1.45,
                      verticalAlign: "top",
                    }}
                  >
                    {comfortable ? f.full_id : f.id}
                  </td>
                  <td style={{ padding: pad, color: ink, verticalAlign: "top", whiteSpace: "nowrap" }}>{fmt(f.txns)}</td>
                  <td style={{ padding: pad, fontWeight: 600, color: "#cf1322", verticalAlign: "top", whiteSpace: "nowrap" }}>{fmtGbpFromAmount(f.amount)}</td>
                  <td style={{ padding: pad, color: ink, verticalAlign: "top", whiteSpace: "nowrap" }}>
                    {f.types_used}/5
                  </td>
                  <td style={{ padding: pad, color: ink, verticalAlign: "top", whiteSpace: "nowrap" }}>{f.countries_hit}</td>
                  <td style={{ padding: pad, fontWeight: 600, color: ink, verticalAlign: "top", whiteSpace: "nowrap" }}>
                    {f.kyc === "PASSED" ? "Yes" : "No"}
                  </td>
                  <td style={{ padding: pad, textAlign: "right", fontWeight: 800, color: ink, verticalAlign: "top", whiteSpace: "nowrap" }}>{f.score.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function FraudstersAuditBlock({
  composite,
  byAmount,
  variant,
  totalFraudsters,
}: {
  composite: Fraudster[];
  byAmount?: Fraudster[];
  variant: "page" | "section" | "print";
  totalFraudsters: number;
}) {
  const ink = "#0f0f0f";
  const muted = "#525252";
  const rule = variant === "page" ? "#ebebeb" : "#e8e8ed";
  const subtle = variant === "page" ? "#a3a3a3" : "#9898ac";
  const compact = variant === "section" || variant === "print";
  const isPage = variant === "page";

  const compositeIds = new Set(composite.map((f) => f.full_id));
  const naiveIds = new Set((byAmount ?? []).map((f) => f.full_id));
  const overlap = [...compositeIds].filter((id) => naiveIds.has(id)).length;

  const chartRows = composite.map((f, i) => ({
    name: `#${i + 1} ${f.id}`,
    dmg: (f.w_value ?? 0) * 100,
    vol: (f.w_txns ?? 0) * 100,
    rate: (f.w_rate ?? 0) * 100,
    types: (f.w_types ?? 0) * 100,
    geo: (f.w_geo ?? 0) * 100,
  }));
  const maxBar = Math.max(...chartRows.map((r) => r.dmg + r.vol + r.rate + r.types + r.geo), 1);
  const xMax = Math.min(100, Math.ceil(maxBar / 5) * 5 + 5);

  const showChart = composite.every(hasDims);

  const volByComposite = composite.map((f, i) => ({
    label: `#${i + 1}  ${f.id}`,
    gbp: f.amount,
  }));
  const scoreByComposite = composite.map((f, i) => ({
    label: `#${i + 1}  ${f.id}`,
    score: Number(f.score.toFixed(1)),
  }));
  const rankCompare =
    byAmount?.length && byAmount.length === composite.length
      ? composite.map((_, i) => ({
          rank: `#${i + 1}`,
          naiveGbp: byAmount[i]?.amount ?? 0,
          compositeGbp: composite[i]?.amount ?? 0,
        }))
      : null;
  const top1 = composite[0];
  const top1Channels = top1
    ? Object.entries(top1.type_breakdown)
        .map(([k, v]) => ({ name: k.replace(/_/g, " "), txns: v }))
        .sort((a, b) => b.txns - a.txns)
    : [];

  const scoringMethodology = (
    <>
      <p style={{ fontWeight: 700, color: ink, marginBottom: 8 }}>Scoring method (fin_crime_audit.pdf)</p>
      <p style={{ margin: 0, lineHeight: 1.65 }}>
        Each fraudster is scored on five dimensions, each scaled to [0, 1] across all {fmt(totalFraudsters)} fraud actors:{" "}
        <strong style={{ color: ink }}>0.35</strong> fraud value + <strong style={{ color: ink }}>0.30</strong> fraud txn count +{" "}
        <strong style={{ color: ink }}>0.15</strong> fraud rate (fraud txns ÷ all user txns) + <strong style={{ color: ink }}>0.10</strong> type diversity +{" "}
        <strong style={{ color: ink }}>0.10</strong> country diversity. Displayed score is 0–100 (weighted sum × 100).
      </p>
    </>
  );

  const scoringBlock = (
    <div
      style={{
        background: variant === "page" ? "#fafafa" : variant === "print" ? "#fafafa" : "#fff1f1",
        border: variant === "page" || variant === "print" ? `1px solid ${rule}` : "1px solid #fecaca",
        borderRadius: 12,
        padding: variant === "print" ? "10px 12px" : compact ? "16px 18px" : "20px 24px",
      }}
    >
      <p style={{ fontSize: variant === "print" ? 10 : compact ? 12 : 13, fontWeight: 700, color: variant === "section" ? "#7f1d1d" : ink, marginBottom: 6 }}>
        Scoring method (fin_crime_audit.pdf)
      </p>
      <p style={{ fontSize: variant === "print" ? 9.5 : compact ? 12 : 13, color: variant === "section" ? "#7f1d1d" : "#737373", lineHeight: 1.65, margin: 0 }}>
        Each fraudster is scored on five dimensions, each scaled to [0, 1] across all {fmt(totalFraudsters)} fraud actors:{" "}
        <strong style={{ color: ink }}>0.35</strong> fraud value + <strong style={{ color: ink }}>0.30</strong> fraud txn count +{" "}
        <strong style={{ color: ink }}>0.15</strong> fraud rate (fraud txns ÷ all user txns) + <strong style={{ color: ink }}>0.10</strong> type diversity +{" "}
        <strong style={{ color: ink }}>0.10</strong> country diversity. Displayed score is 0–100 (weighted sum × 100).
      </p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 20 : 28 }}>
      {isPage ? (
        <Panel
          title="Composite model"
          description="Composite ranks persistent, cross-rail actors; naive £ ranks headline loss—use both for triage."
          methodology={scoringMethodology}
          noPad
        >
          {null}
        </Panel>
      ) : (
        scoringBlock
      )}

      {isPage && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <Panel
            title="Fraud volume by composite rank"
            description="Fraud-tagged £ (GBP) for each of the top 5 composite-ranked users."
            methodology="Fraud £ uses raw `AMOUNT` sums (same scale as executive fraud-loss KPIs). Bars follow composite order (#1 highest composite score), not naive £ order."
          >
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volByComposite} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#a3a3a3", fontSize: 11, fontFamily: "inherit" }}
                    tickFormatter={(v) => fmtAxisGbp(v)}
                    axisLine={{ stroke: "#ebebeb" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={132}
                    tick={{ fill: "#525252", fontSize: 11, fontFamily: "inherit" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#fafafa" }}
                    content={({ active, payload }) =>
                      active && payload?.[0] ? (
                        <ChartTooltipRoot>
                          <ChartTooltipTitle>{payload[0].payload.label}</ChartTooltipTitle>
                          <ChartTooltipRows>
                            <ChartTooltipRow
                              label="Fraud £"
                              value={fmtGbpFromAmount(Math.round(payload[0].payload.gbp))}
                              valueColor="#cf1322"
                            />
                          </ChartTooltipRows>
                        </ChartTooltipRoot>
                      ) : null
                    }
                  />
                  <Bar dataKey="gbp" name="Fraud £" fill="#cf1322" radius={[0, 3, 3, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel
            title="Composite score by rank"
            description="Final 0–100 score for the same five users (composite ordering)."
            methodology="Score is the weighted sum defined in the Composite model tooltip (fin_crime_audit.pdf weights, each dimension normalised across all fraud actors)."
          >
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreByComposite} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: "#a3a3a3", fontSize: 11, fontFamily: "inherit" }}
                    axisLine={{ stroke: "#ebebeb" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={132}
                    tick={{ fill: "#525252", fontSize: 11, fontFamily: "inherit" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#fafafa" }}
                    content={({ active, payload }) =>
                      active && payload?.[0] ? (
                        <ChartTooltipRoot>
                          <ChartTooltipTitle>{payload[0].payload.label}</ChartTooltipTitle>
                          <ChartTooltipRows>
                            <ChartTooltipRow label="Composite score" value={payload[0].payload.score} />
                          </ChartTooltipRows>
                        </ChartTooltipRoot>
                      ) : null
                    }
                  />
                  <Bar dataKey="score" name="Score" fill="#0f0f0f" radius={[0, 3, 3, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      )}

      {isPage && rankCompare && (
        <Panel
          title="Fraud £ at each rank — naive vs composite"
          description="Same rank position (#1–#5): naive list vs composite list — often different users at the same slot."
          methodology="Naive: i-th bar is fraud £ for the user ranked i by raw fraud amount. Composite: i-th bar is fraud £ for the user ranked i by composite score. Compares ‘who sits at each rank’ not cumulative curves."
        >
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankCompare} margin={{ top: 8, right: 8, left: 4, bottom: 8 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="rank" tick={{ fill: "#a3a3a3", fontSize: 11, fontFamily: "inherit" }} axisLine={{ stroke: "#ebebeb" }} tickLine={false} />
                <YAxis
                  tick={{ fill: "#a3a3a3", fontSize: 11, fontFamily: "inherit" }}
                  tickFormatter={(v) => fmtAxisGbp(v)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#fafafa" }}
                  content={(props) =>
                    props.active && props.payload?.length ? (
                      <ChartTooltipFromPayload
                        {...props}
                        formatValue={(v) => fmtAxisGbp(Number(v))}
                      />
                    ) : null
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#a3a3a3" }} />
                <Bar dataKey="naiveGbp" name="Naive list (£)" fill="#a3a3a3" radius={[3, 3, 0, 0]} maxBarSize={36} />
                <Bar dataKey="compositeGbp" name="Composite list (£)" fill="#cf1322" radius={[3, 3, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      {isPage && top1Channels.length > 0 && (
        <Panel
          title="#1 composite — fraud transactions by type"
          description={`Channel mix for ${top1?.id}: fraud-labelled txn counts only.`}
          methodology="Counts come from type_breakdown on the top composite-ranked user — fraud-labelled transactions per channel in the extract."
        >
          <div style={{ width: "100%", height: Math.max(200, 44 * top1Channels.length + 48) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top1Channels} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "#a3a3a3", fontSize: 11, fontFamily: "inherit" }}
                  axisLine={{ stroke: "#ebebeb" }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={112}
                  tick={{ fill: "#525252", fontSize: 11, fontFamily: "inherit" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#fafafa" }}
                  content={({ active, payload }) =>
                    active && payload?.[0] ? (
                      <ChartTooltipRoot>
                        <ChartTooltipTitle>{payload[0].payload.name}</ChartTooltipTitle>
                        <ChartTooltipRows>
                          <ChartTooltipRow label="Fraud txns" value={fmt(payload[0].payload.txns)} />
                        </ChartTooltipRows>
                      </ChartTooltipRoot>
                    ) : null
                  }
                />
                <Bar dataKey="txns" name="Fraud txns" fill="#0f0f0f" radius={[0, 3, 3, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      {byAmount && byAmount.length > 0 && (
        isPage ? (
          <Panel
            title="Dossier tables"
            description="Naive £ vs composite score — same columns; tables stack when the viewport is narrow so columns stay readable."
            methodology="User ID is the full UUID from the extract (hover still shows it in the cell title). KYC = worst snapshot seen for that user in the fraud-labelled rows. Types = distinct fraud channel count of 5."
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(560px, 1fr))", gap: 24 }}>
              <FraudsterDossierTable rows={byAmount} title="Naive — top 5 by fraud £" ink={ink} muted={muted} rule={rule} subtle={subtle} compact={compact} dense={false} comfortable />
              <FraudsterDossierTable rows={composite} title="Composite — top 5 by score" ink={ink} muted={muted} rule={rule} subtle={subtle} compact={compact} dense={false} comfortable />
            </div>
          </Panel>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: variant === "print" ? "1fr" : "1fr 1fr", gap: compact ? 12 : 16 }}>
            <FraudsterDossierTable rows={byAmount} title="Naive — top 5 by fraud £" ink={ink} muted={muted} rule={rule} subtle={subtle} compact={compact} dense={variant === "print"} />
            <FraudsterDossierTable rows={composite} title="Composite — top 5 by score" ink={ink} muted={muted} rule={rule} subtle={subtle} compact={compact} dense={variant === "print"} />
          </div>
        )
      )}

      {(!byAmount || byAmount.length === 0) && (
        isPage ? (
          <Panel title="Top-5 dossier" description="Composite-ranked users only (naive-by-£ list not in this extract).">
            <FraudsterDossierTable rows={composite} title="Composite ranking" ink={ink} muted={muted} rule={rule} subtle={subtle} compact={compact} dense={false} comfortable />
          </Panel>
        ) : (
          <FraudsterDossierTable rows={composite} title="Top-5 dossier (composite)" ink={ink} muted={muted} rule={rule} subtle={subtle} compact={compact} dense={variant === "print"} />
        )
      )}

      {byAmount && byAmount.length > 0 && (
        <p style={{ fontSize: isPage ? 14 : compact ? 11 : 12, color: isPage ? "#525252" : muted, lineHeight: 1.6, margin: 0, maxWidth: isPage ? 900 : undefined }}>
          <strong style={{ color: ink }}>Overlap.</strong> {overlap} of 5 user{overlap === 1 ? "" : "s"} appear on both lists. Naive £ ranking favours one-shot high-loss events; composite favours serial, multi-rail actors (forward risk).
        </p>
      )}

      {showChart && (
        isPage ? (
          <Panel
            title="Score decomposition"
            description="How each top-5 actor’s score stacks across the five model dimensions (points out of 100)."
            methodology="Segments are w_value, w_txns, w_rate, w_types, w_geo × 100 from analytics — same weights as fin_crime_audit.pdf (0.35 / 0.30 / 0.15 / 0.10 / 0.10 on normalised inputs)."
          >
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={chartRows} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, xMax]}
                    tick={{ fontSize: 11, fill: subtle, fontFamily: "inherit" }}
                    tickFormatter={(v) => `${v}`}
                    axisLine={{ stroke: rule }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={128}
                    tick={{ fontSize: 11, fill: muted, fontFamily: "inherit" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#fafafa" }}
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <ChartTooltipRoot>
                          {label != null && label !== "" && <ChartTooltipTitle>{label}</ChartTooltipTitle>}
                          <ChartTooltipRows>
                            {payload.map((p) => (
                              <ChartTooltipRow
                                key={String(p.dataKey)}
                                label={String(p.name ?? p.dataKey)}
                                value={typeof p.value === "number" ? p.value.toFixed(1) : String(p.value)}
                                valueColor={ink}
                              />
                            ))}
                          </ChartTooltipRows>
                          <ChartTooltipFooter>
                            Total{" "}
                            <span style={{ fontWeight: 700, color: ink }}>
                              {payload.reduce((s, p) => s + (typeof p.value === "number" ? p.value : 0), 0).toFixed(1)}
                            </span>
                          </ChartTooltipFooter>
                        </ChartTooltipRoot>
                      ) : null
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: subtle }} />
                  <Bar dataKey="dmg" name="Value (35%)" stackId="s" fill={DIM_COLORS.dmg} />
                  <Bar dataKey="vol" name="Txns (30%)" stackId="s" fill={DIM_COLORS.vol} />
                  <Bar dataKey="rate" name="Fraud rate (15%)" stackId="s" fill={DIM_COLORS.rate} />
                  <Bar dataKey="types" name="Type mix (10%)" stackId="s" fill={DIM_COLORS.types} />
                  <Bar dataKey="geo" name="Corridors (10%)" stackId="s" fill={DIM_COLORS.geo} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        ) : (
          <div>
            <p
              style={{
                fontSize: compact ? 11 : 12,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: subtle,
                marginBottom: compact ? 8 : 10,
              }}
            >
              Composite score decomposed by dimension (points out of 100)
            </p>
            <div style={{ width: "100%", height: variant === "print" ? 200 : compact ? 220 : 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={chartRows} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" domain={[0, xMax]} tick={{ fontSize: compact ? 10 : 11, fill: subtle }} tickFormatter={(v) => `${v}`} />
                  <YAxis type="category" dataKey="name" width={compact ? 108 : 128} tick={{ fontSize: compact ? 10 : 11, fill: muted }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: compact ? 10 : 11 }} />
                  <Bar dataKey="dmg" name="Value (35%)" stackId="s" fill={DIM_COLORS.dmg} />
                  <Bar dataKey="vol" name="Txns (30%)" stackId="s" fill={DIM_COLORS.vol} />
                  <Bar dataKey="rate" name="Fraud rate (15%)" stackId="s" fill={DIM_COLORS.rate} />
                  <Bar dataKey="types" name="Type mix (10%)" stackId="s" fill={DIM_COLORS.types} />
                  <Bar dataKey="geo" name="Corridors (10%)" stackId="s" fill={DIM_COLORS.geo} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      )}

      {!showChart && (
        <p style={{ fontSize: 12, color: subtle, margin: 0 }}>
          Re-upload the CSV or refresh bundled analytics to see the dimension breakdown chart (older snapshots omit per-dimension weights).
        </p>
      )}
    </div>
  );
}
